import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import { pool } from '../config/database';
import { NotificationPayload } from '../types';

// Initialize Firebase Admin SDK if credentials are available
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
    console.log('[NotificationService] Firebase Admin SDK initialized');
  } else {
    console.log('[NotificationService] Firebase credentials not configured, using Expo fallback');
  }
} catch (error) {
  console.warn('[NotificationService] Firebase init failed:', error);
}

export class NotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true,
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
   * Supports both Expo Push Tokens and native FCM/APNs tokens
   */
  async sendNotificationToTokens(
    tokens: string[],
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`[NotificationService] Attempting to send to ${tokens.length} tokens`);
      
      // Separate Expo tokens from native FCM tokens
      const expoTokens: string[] = [];
      const fcmTokens: string[] = [];
      
      for (const token of tokens) {
        if (Expo.isExpoPushToken(token)) {
          expoTokens.push(token);
        } else if (token && token.length > 20) {
          // Native FCM/APNs tokens are typically longer strings
          fcmTokens.push(token);
        }
      }
      
      console.log(`[NotificationService] Token breakdown: ${expoTokens.length} Expo, ${fcmTokens.length} FCM/native`);

      // Build notification message
      const { title, body, data } = this.buildNotificationMessage(payload);
      const channelId = this.getChannelIdForReason(payload.reason);
      
      let successCount = 0;

      // Send to Expo tokens if any
      if (expoTokens.length > 0) {
        const expoSuccess = await this.sendViaExpo(expoTokens, title, body, data, channelId);
        if (expoSuccess) successCount++;
      }

      // Send to native FCM tokens if Firebase is configured
      if (fcmTokens.length > 0) {
        const fcmSuccess = await this.sendViaFCM(fcmTokens, title, body, data, channelId);
        if (fcmSuccess) successCount++;
      }

      return successCount > 0;
    } catch (error) {
      console.error('Error sending push notifications:', error);
      return false;
    }
  }

  /**
   * Send via Expo Push Service
   */
  private async sendViaExpo(
    tokens: string[],
    title: string,
    body: string,
    data: any,
    channelId: string
  ): Promise<boolean> {
    try {
      const messages: ExpoPushMessage[] = tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId,
      }));

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      const errors = tickets.filter(t => t.status === 'error');
      console.log(`[NotificationService] Expo: ${tickets.length - errors.length}/${tickets.length} successful`);
      
      return errors.length < tickets.length;
    } catch (error) {
      console.error('[NotificationService] Expo send error:', error);
      return false;
    }
  }

  /**
   * Send via Firebase Cloud Messaging (for native FCM tokens)
   */
  private async sendViaFCM(
    tokens: string[],
    title: string,
    body: string,
    data: any,
    channelId: string
  ): Promise<boolean> {
    if (!firebaseInitialized) {
      console.warn('[NotificationService] Firebase not initialized, skipping FCM send');
      return false;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high',
          notification: {
            channelId,
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`[NotificationService] FCM: ${response.successCount}/${tokens.length} successful`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`[NotificationService] FCM error for token ${idx}:`, resp.error);
          }
        });
      }

      return response.successCount > 0;
    } catch (error) {
      console.error('[NotificationService] FCM send error:', error);
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
