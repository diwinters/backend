import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { pool } from '../config/database';
import { NotificationPayload } from '../types';

export class NotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true, // Use FCM v1 API
    });
  }

  /**
   * Send push notification to a user by their DID
   */
  async sendNotificationToUser(did: string, payload: NotificationPayload): Promise<boolean> {
    try {
      // Get all active device tokens for this user
      const result = await pool.query(
        `SELECT ud.device_token 
         FROM user_devices ud
         JOIN users u ON u.id = ud.user_id
         WHERE u.did = $1 AND ud.is_active = true`,
        [did]
      );

      if (result.rows.length === 0) {
        console.warn(`No active devices found for user ${did}`);
        return false;
      }

      const deviceTokens = result.rows.map(row => row.device_token);
      return await this.sendNotificationToTokens(deviceTokens, payload);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send push notification to specific device tokens
   */
  async sendNotificationToTokens(
    tokens: string[],
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`[NotificationService] Attempting to send to ${tokens.length} tokens`);
      
      // Filter out invalid tokens and log them
      const validTokens: string[] = [];
      const invalidTokens: string[] = [];
      
      for (const token of tokens) {
        if (Expo.isExpoPushToken(token)) {
          validTokens.push(token);
        } else {
          invalidTokens.push(token);
        }
      }
      
      if (invalidTokens.length > 0) {
        console.warn(`[NotificationService] ${invalidTokens.length} invalid tokens found:`, 
          invalidTokens.map(t => t.substring(0, 30) + '...'));
      }

      if (validTokens.length === 0) {
        console.warn('[NotificationService] No valid Expo push tokens provided');
        return false;
      }
      
      console.log(`[NotificationService] Sending to ${validTokens.length} valid Expo tokens`);

      // Build notification message based on payload type
      const { title, body, data } = this.buildNotificationMessage(payload);
      
      // Get the appropriate Android notification channel based on payload reason
      const channelId = this.getChannelIdForReason(payload.reason);

      // Create messages for each token
      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId, // Use the appropriate channel for the notification type
      }));
      
      console.log(`[NotificationService] Sending notification: "${title}" via channel "${channelId}"`);

      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          console.log(`[NotificationService] Sent chunk, tickets:`, ticketChunk.map((t: ExpoPushTicket) => t.status));
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending notification chunk:', error);
        }
      }

      // Check for errors in tickets
      const errors = tickets.filter(ticket => ticket.status === 'error');
      if (errors.length > 0) {
        console.error('Push notification errors:', errors);
      }
      
      console.log(`[NotificationService] Push result: ${tickets.length - errors.length}/${tickets.length} successful`);

      return errors.length < tickets.length; // Success if at least one notification sent
    } catch (error) {
      console.error('Error sending push notifications:', error);
      return false;
    }
  }

  /**
   * Build notification message from payload
   */
  private buildNotificationMessage(payload: NotificationPayload): {
    title: string;
    body: string;
    data: any;
  } {
    switch (payload.reason) {
      case 'ride-offer':
        return {
          title: 'New Ride Request',
          body: `From ${payload.pickupAddress} to ${payload.dropoffAddress}`,
          data: {
            type: 'ride-offer',
            rideId: payload.rideId,
            pickupAddress: payload.pickupAddress,
            dropoffAddress: payload.dropoffAddress,
            estimatedPrice: payload.estimatedPrice,
          },
        };

      case 'ride-assigned':
        return {
          title: 'Driver Assigned',
          body: `${payload.driverName || 'Your driver'} will arrive in ${payload.estimatedArrival} minutes`,
          data: {
            type: 'ride-assigned',
            rideId: payload.rideId,
            driverDid: payload.driverDid,
            driverName: payload.driverName,
            estimatedArrival: payload.estimatedArrival,
          },
        };

      case 'ride-status-update':
        return {
          title: 'Ride Status Update',
          body: this.getRideStatusMessage(payload.status),
          data: {
            type: 'ride-status-update',
            rideId: payload.rideId,
            status: payload.status,
          },
        };

      default:
        return {
          title: 'Raceef Notification',
          body: 'You have a new notification',
          data: payload,
        };
    }
  }

  /**
   * Get user-friendly message for ride status
   */
  private getRideStatusMessage(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Your ride has been accepted';
      case 'driver_arrived':
        return 'Your driver has arrived';
      case 'in_progress':
        return 'Your ride is in progress';
      case 'completed':
        return 'Your ride is complete';
      case 'cancelled':
        return 'Your ride has been cancelled';
      default:
        return `Ride status: ${status}`;
    }
  }

  /**
   * Get Android notification channel ID based on notification reason
   */
  private getChannelIdForReason(reason: string): string {
    switch (reason) {
      case 'ride-offer':
        return 'ride-offer';
      case 'ride-assigned':
        return 'ride-assigned';
      case 'ride-status-update':
        return 'ride-status-update';
      default:
        return 'default';
    }
  }

  /**
   * Send notification to all available drivers within radius of pickup location
   */
  async notifyNearbyDrivers(
    pickupLat: number,
    pickupLng: number,
    payload: NotificationPayload,
    radiusMeters: number = 5000
  ): Promise<number> {
    try {
      // Find nearby available drivers
      const result = await pool.query(
        `SELECT DISTINCT u.did, ud.device_token
         FROM driver_locations dl
         JOIN users u ON u.did = dl.driver_did
         JOIN user_devices ud ON ud.user_id = u.id
         WHERE dl.is_available = true
           AND ud.is_active = true
           AND ST_DWithin(
             dl.location,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             $3
           )`,
        [pickupLng, pickupLat, radiusMeters]
      );

      if (result.rows.length === 0) {
        console.warn('No nearby drivers found');
        return 0;
      }

      const deviceTokens = result.rows.map(row => row.device_token);
      const success = await this.sendNotificationToTokens(deviceTokens, payload);

      return success ? result.rows.length : 0;
    } catch (error) {
      console.error('Error notifying nearby drivers:', error);
      return 0;
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
