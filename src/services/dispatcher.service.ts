import { pool } from '../config/database';
import {
  RideBookingRequest,
  Ride,
  DBRide,
  NearbyDriver,
  DriverAvailabilityUpdate,
} from '../types';
import { notificationService } from './notification.service';
import { broadcastToUser } from './websocket.service';

export class DispatcherService {
  /**
   * Ensure user exists in database, create if not
   */
  private async ensureUserExists(did: string, userType: 'rider' | 'driver' | 'both' = 'rider'): Promise<void> {
    await pool.query(
      `INSERT INTO users (did, user_type, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (did) DO NOTHING`,
      [did, userType]
    );
  }

  /**
   * Create a new ride request
   */
  async createRide(request: RideBookingRequest): Promise<Ride> {
    try {
      // Ensure the rider exists in the users table
      await this.ensureUserExists(request.customerDID, 'rider');

      // Insert ride into database
      const result = await pool.query<DBRide>(
        `INSERT INTO rides (
          order_id, rider_did, pickup_lat, pickup_lng, pickup_address,
          dropoff_lat, dropoff_lng, dropoff_address, booking_type,
          scheduled_time, rider_name, rider_phone, rider_notes,
          delivery_recipient_name, delivery_recipient_phone, delivery_instructions,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          request.orderId || null,
          request.customerDID,
          request.pickup.latitude,
          request.pickup.longitude,
          request.pickup.address || null,
          request.dropoff.latitude,
          request.dropoff.longitude,
          request.dropoff.address || null,
          request.bookingType,
          request.scheduledTime || null,
          request.riderInfo?.name || null,
          request.riderInfo?.phone || null,
          request.riderInfo?.notes || null,
          request.deliveryInfo?.recipientName || null,
          request.deliveryInfo?.recipientPhone || null,
          request.deliveryInfo?.instructions || null,
          'pending',
        ]
      );

      const ride = this.mapDBRideToRide(result.rows[0]);

      // Find and notify nearby drivers
      await this.notifyNearbyDriversAboutRide(ride);

      return ride;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  }

  /**
   * Find nearby available drivers and send them ride offer notifications
   */
  private async notifyNearbyDriversAboutRide(ride: Ride): Promise<void> {
    try {
      const nearbyDrivers = await this.findNearbyDrivers(
        ride.pickupLat,
        ride.pickupLng,
        5000 // 5km radius
      );

      if (nearbyDrivers.length === 0) {
        console.warn(`No drivers found near pickup location for ride ${ride.id}`);
        return;
      }

      console.log(`Found ${nearbyDrivers.length} drivers near ride ${ride.id}`);

      // Send notification to all nearby drivers
      const notified = await notificationService.notifyNearbyDrivers(
        ride.pickupLat,
        ride.pickupLng,
        {
          reason: 'ride-offer',
          rideId: ride.id,
          pickupAddress: ride.pickupAddress || 'Pickup location',
          dropoffAddress: ride.dropoffAddress || 'Dropoff location',
          estimatedPrice: ride.estimatedPrice,
          recipientDid: '', // Will be sent to multiple drivers
        },
        5000
      );

      console.log(`Notified ${notified} drivers about ride ${ride.id}`);

      // Update ride status to 'offered'
      await pool.query(
        'UPDATE rides SET status = $1 WHERE id = $2',
        ['offered', ride.id]
      );
    } catch (error) {
      console.error('Error notifying nearby drivers:', error);
    }
  }

  /**
   * Find nearby available drivers using PostGIS
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000
  ): Promise<NearbyDriver[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM find_nearby_drivers($1, $2, $3)`,
        [latitude, longitude, radiusMeters]
      );

      return result.rows.map(row => ({
        driverDid: row.driver_did,
        distanceMeters: parseFloat(row.distance_meters),
        latitude: row.latitude,
        longitude: row.longitude,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Error finding nearby drivers:', error);
      return [];
    }
  }

  /**
   * Update driver availability and location
   */
  async updateDriverAvailability(update: DriverAvailabilityUpdate): Promise<void> {
    try {
      // Ensure driver exists in users table
      await this.ensureUserExists(update.driverDID, 'driver');
      
      // Upsert driver location
      await pool.query(
        `INSERT INTO driver_locations (driver_did, latitude, longitude, heading, speed, is_available, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (driver_did) 
         DO UPDATE SET 
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           heading = EXCLUDED.heading,
           speed = EXCLUDED.speed,
           is_available = EXCLUDED.is_available,
           updated_at = NOW()
         WHERE driver_locations.driver_did = EXCLUDED.driver_did`,
        [
          update.driverDID,
          update.currentLocation.latitude,
          update.currentLocation.longitude,
          update.heading || null,
          update.speed || null,
          update.isAvailable,
        ]
      );

      // Broadcast location update to connected clients
      broadcastToUser(update.driverDID, {
        type: 'driver:location-update',
        payload: {
          driverDid: update.driverDID,
          latitude: update.currentLocation.latitude,
          longitude: update.currentLocation.longitude,
          heading: update.heading,
          speed: update.speed,
          isAvailable: update.isAvailable,
        },
      });
    } catch (error) {
      console.error('Error updating driver availability:', error);
      throw error;
    }
  }

  /**
   * Assign driver to ride
   */
  async assignDriverToRide(rideId: string, driverDid: string): Promise<Ride> {
    try {
      // Check if driver already has an active ride
      const activeRides = await this.getDriverActiveRides(driverDid);
      if (activeRides.length > 0) {
        throw new Error('Driver already has an active ride');
      }

      // Update ride with driver and status
      const result = await pool.query<DBRide>(
        `UPDATE rides 
         SET driver_did = $1, status = $2, accepted_at = NOW()
         WHERE id = $3 AND status IN ('pending', 'offered')
         RETURNING *`,
        [driverDid, 'accepted', rideId]
      );

      if (result.rows.length === 0) {
        throw new Error('Ride not found or already assigned');
      }

      const ride = this.mapDBRideToRide(result.rows[0]);

      // Get full driver info including avatar and phone
      const driverResult = await pool.query(
        'SELECT display_name, avatar_url, phone FROM users WHERE did = $1',
        [driverDid]
      );
      const driverInfo = driverResult.rows[0];
      const driverName = driverInfo?.display_name || 'Driver';
      const driverAvatar = driverInfo?.avatar_url;
      const driverPhone = driverInfo?.phone;

      // Add driver info to ride object
      ride.driverName = driverName;
      ride.driverAvatar = driverAvatar;
      ride.driverPhone = driverPhone;

      // Calculate estimated arrival time (simplified - use distance / average speed)
      const nearbyDrivers = await this.findNearbyDrivers(ride.pickupLat, ride.pickupLng);
      const driver = nearbyDrivers.find(d => d.driverDid === driverDid);
      const estimatedArrival = driver 
        ? Math.ceil(driver.distanceMeters / 500) // Assume 500m/min average speed
        : 5; // Default 5 minutes

      // Notify rider about assigned driver with full info
      await notificationService.sendNotificationToUser(ride.riderDid, {
        reason: 'ride-assigned',
        rideId: ride.id,
        driverDid,
        driverName,
        driverAvatar,
        driverPhone,
        estimatedArrival,
        recipientDid: ride.riderDid,
      });

      // Broadcast to rider via WebSocket with full driver info
      broadcastToUser(ride.riderDid, {
        type: 'ride:assigned',
        payload: {
          rideId: ride.id,
          driverDid,
          driverName,
          driverAvatar,
          driverPhone,
          estimatedArrival,
        },
      });

      // Add to ride history
      await pool.query(
        `INSERT INTO ride_history (ride_id, status, changed_by, notes)
         VALUES ($1, $2, $3, $4)`,
        [ride.id, 'accepted', driverDid, 'Driver accepted ride']
      );

      return ride;
    } catch (error) {
      console.error('Error assigning driver to ride:', error);
      throw error;
    }
  }

  /**
   * Update ride status
   */
  async updateRideStatus(
    rideId: string,
    status: string,
    updatedBy: string,
    notes?: string
  ): Promise<Ride> {
    try {
      // Update ride status - use separate parameters to avoid PostgreSQL type inference issues
      const result = await pool.query<DBRide>(
        `UPDATE rides 
         SET status = $1::text,
             started_at = CASE WHEN $1::text = 'in_progress' THEN NOW() ELSE started_at END,
             completed_at = CASE WHEN $1::text = 'completed' THEN NOW() ELSE completed_at END,
             cancelled_at = CASE WHEN $1::text = 'cancelled' THEN NOW() ELSE cancelled_at END,
             cancellation_reason = CASE WHEN $1::text = 'cancelled' THEN $3::text ELSE cancellation_reason END
         WHERE id = $2::uuid
         RETURNING *`,
        [status, rideId, notes || null]
      );

      if (result.rows.length === 0) {
        throw new Error('Ride not found');
      }

      const ride = this.mapDBRideToRide(result.rows[0]);

      // Add to ride history
      await pool.query(
        `INSERT INTO ride_history (ride_id, status, changed_by, notes)
         VALUES ($1, $2, $3, $4)`,
        [rideId, status, updatedBy, notes || null]
      );

      // Notify rider about status change
      await notificationService.sendNotificationToUser(ride.riderDid, {
        reason: 'ride-status-update',
        rideId: ride.id,
        status: ride.status,
        recipientDid: ride.riderDid,
      });

      // Broadcast status update via WebSocket
      broadcastToUser(ride.riderDid, {
        type: 'ride:status-update',
        payload: { rideId: ride.id, status: ride.status },
      });

      if (ride.driverDid) {
        broadcastToUser(ride.driverDid, {
          type: 'ride:status-update',
          payload: { rideId: ride.id, status: ride.status },
        });
      }

      return ride;
    } catch (error) {
      console.error('Error updating ride status:', error);
      throw error;
    }
  }

  /**
   * Get ride by ID (with driver info if assigned)
   */
  async getRideById(rideId: string): Promise<Ride | null> {
    try {
      const result = await pool.query<DBRide>(
        `SELECT r.*, 
                u.display_name as driver_name, 
                u.avatar_url as driver_avatar, 
                u.phone as driver_phone
         FROM rides r
         LEFT JOIN users u ON u.did = r.driver_did
         WHERE r.id = $1`,
        [rideId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDBRideToRide(result.rows[0]);
    } catch (error) {
      console.error('Error getting ride:', error);
      throw error;
    }
  }

  /**
   * Get active rides for a driver (with full driver info)
   */
  async getDriverActiveRides(driverDid: string): Promise<Ride[]> {
    try {
      const result = await pool.query<DBRide>(
        `SELECT r.*, 
                u.display_name as driver_name, 
                u.avatar_url as driver_avatar, 
                u.phone as driver_phone
         FROM rides r
         LEFT JOIN users u ON u.did = r.driver_did
         WHERE r.driver_did = $1 
           AND r.status IN ('accepted', 'driver_arrived', 'in_progress')
         ORDER BY r.created_at DESC`,
        [driverDid]
      );

      return result.rows.map(row => this.mapDBRideToRide(row));
    } catch (error) {
      console.error('Error getting driver active rides:', error);
      throw error;
    }
  }

  /**
   * Get pending/offered rides near a driver
   */
  async getPendingRidesForDriver(driverDid: string): Promise<Ride[]> {
    try {
      // Check if driver already has an active ride - if so, return empty
      const activeRides = await this.getDriverActiveRides(driverDid);
      if (activeRides.length > 0) {
        console.log(`[getPendingRides] Driver ${driverDid} has active ride, not showing pending rides`);
        return [];
      }

      // Get driver's current location
      const driverLocation = await pool.query(
        'SELECT latitude, longitude FROM driver_locations WHERE driver_did = $1 AND is_available = true',
        [driverDid]
      );

      if (driverLocation.rows.length === 0) {
        console.log(`[getPendingRides] Driver ${driverDid} not available or location unknown`);
        return [];
      }

      const { latitude, longitude } = driverLocation.rows[0];

      // Find pending/offered rides within 10km of driver
      const result = await pool.query<DBRide>(
        `SELECT r.*, 
                ST_Distance(
                  ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(r.pickup_lng, r.pickup_lat), 4326)::geography
                ) as distance_meters
         FROM rides r
         WHERE r.status IN ('pending', 'offered')
           AND ST_DWithin(
             ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
             ST_SetSRID(ST_MakePoint(r.pickup_lng, r.pickup_lat), 4326)::geography,
             10000
           )
         ORDER BY distance_meters ASC
         LIMIT 20`,
        [latitude, longitude]
      );

      console.log(`[getPendingRides] Found ${result.rows.length} pending rides for driver ${driverDid}`);

      return result.rows.map(row => this.mapDBRideToRide(row));
    } catch (error) {
      console.error('Error getting pending rides for driver:', error);
      throw error;
    }
  }

  /**
   * Map database row to Ride object
   */
  private mapDBRideToRide(dbRide: DBRide): Ride {
    return {
      id: dbRide.id,
      orderId: dbRide.order_id || undefined,
      riderDid: dbRide.rider_did,
      driverDid: dbRide.driver_did || undefined,
      driverName: dbRide.driver_name || undefined,
      driverAvatar: dbRide.driver_avatar || undefined,
      driverPhone: dbRide.driver_phone || undefined,
      pickupLat: dbRide.pickup_lat,
      pickupLng: dbRide.pickup_lng,
      pickupAddress: dbRide.pickup_address || undefined,
      dropoffLat: dbRide.dropoff_lat,
      dropoffLng: dbRide.dropoff_lng,
      dropoffAddress: dbRide.dropoff_address || undefined,
      bookingType: dbRide.booking_type,
      scheduledTime: dbRide.scheduled_time || undefined,
      riderName: dbRide.rider_name || undefined,
      riderPhone: dbRide.rider_phone || undefined,
      riderNotes: dbRide.rider_notes || undefined,
      deliveryRecipientName: dbRide.delivery_recipient_name || undefined,
      deliveryRecipientPhone: dbRide.delivery_recipient_phone || undefined,
      deliveryInstructions: dbRide.delivery_instructions || undefined,
      status: dbRide.status,
      estimatedPrice: dbRide.estimated_price ? parseFloat(dbRide.estimated_price.toString()) : undefined,
      finalPrice: dbRide.final_price ? parseFloat(dbRide.final_price.toString()) : undefined,
      createdAt: dbRide.created_at,
      acceptedAt: dbRide.accepted_at || undefined,
      startedAt: dbRide.started_at || undefined,
      completedAt: dbRide.completed_at || undefined,
      cancelledAt: dbRide.cancelled_at || undefined,
      cancellationReason: dbRide.cancellation_reason || undefined,
      rating: dbRide.rating || undefined,
    };
  }
}

// Singleton instance
export const dispatcherService = new DispatcherService();
