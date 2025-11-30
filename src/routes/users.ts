import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import {
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  ErrorResponse,
} from '../types';

const router = Router();

/**
 * POST /api/users/register
 * Register device token for push notifications
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { did, platform, token, appId, displayName, avatarUrl, phone }: RegisterDeviceRequest = req.body;

    // Validate request
    if (!did || !platform || !token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: did, platform, token',
      } as ErrorResponse);
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Platform must be ios or android',
      } as ErrorResponse);
    }

    // Ensure user exists and update profile data from Bluesky
    const userResult = await pool.query(
      `INSERT INTO users (did, user_type, is_active, display_name, avatar_url, phone, updated_at)
       VALUES ($1, 'rider', true, $2, $3, $4, NOW())
       ON CONFLICT (did) DO UPDATE SET 
         is_active = true,
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         phone = COALESCE(EXCLUDED.phone, users.phone),
         updated_at = NOW()
       RETURNING id`,
      [did, displayName || null, avatarUrl || null, phone || null]
    );

    const userId = userResult.rows[0].id;

    // Register device token
    await pool.query(
      `INSERT INTO user_devices (user_id, device_token, platform, app_id, is_active, last_seen)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (device_token) 
       DO UPDATE SET 
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         app_id = EXCLUDED.app_id,
         is_active = true,
         last_seen = NOW()`,
      [userId, token, platform, appId || null]
    );

    console.log(`Registered device token for user ${did} (${platform})`);

    res.json({
      success: true,
      message: 'Device token registered successfully',
    } as RegisterDeviceResponse);
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device token',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * POST /api/users/unregister
 * Unregister device token
 */
router.post('/unregister', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: token',
      } as ErrorResponse);
    }

    await pool.query(
      'UPDATE user_devices SET is_active = false WHERE device_token = $1',
      [token]
    );

    console.log(`Unregistered device token: ${token}`);

    res.json({
      success: true,
      message: 'Device token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister device token',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/users/:did
 * Get user profile
 */
router.get('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;

    const result = await pool.query(
      'SELECT * FROM users WHERE did = $1',
      [did]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ErrorResponse);
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      details: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
});

/**
 * GET /api/users/:did/driver-status
 * Check if user is an approved driver and their role
 */
router.get('/:did/driver-status', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;

    const result = await pool.query(
      `SELECT approved_driver, driver_role, user_type
       FROM users
       WHERE did = $1`,
      [did]
    );

    if (result.rows.length === 0) {
      // User not in database yet - not a driver
      return res.json({
        success: true,
        isDriver: false,
        driverRole: null,
      });
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      isDriver: user.approved_driver === true,
      driverRole: user.driver_role, // 'taxi' or 'delivery'
      userType: user.user_type, // 'driver', 'livreur', or 'both'
    });
  } catch (error) {
    console.error('Error checking driver status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check driver status',
    } as ErrorResponse);
  }
});

/**
 * GET /api/users/:did/rides
 * Get ride history for a user (as rider or driver)
 */
router.get('/:did/rides', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string;

    let statusCondition = '';
    const params: any[] = [did, limit, offset];

    if (statusFilter) {
      const statuses = statusFilter.split(',');
      statusCondition = `AND status = ANY($4)`;
      params.push(statuses);
    }

    // Count total rides
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM rides 
       WHERE (rider_did = $1 OR driver_did = $1)
       ${statusCondition}`,
      statusFilter ? [did, statusFilter.split(',')] : [did]
    );

    // Get rides with driver/rider info
    const result = await pool.query(
      `SELECT r.*,
              u1.display_name as rider_name,
              u2.display_name as driver_name,
              u2.phone as driver_phone,
              CASE 
                WHEN booking_type = 'delivery' THEN 'delivery'
                ELSE 'ride'
              END as ride_type
       FROM rides r
       LEFT JOIN users u1 ON r.rider_did = u1.did
       LEFT JOIN users u2 ON r.driver_did = u2.did
       WHERE (r.rider_did = $1 OR r.driver_did = $1)
       ${statusCondition}
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    res.json({
      success: true,
      rides: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (error) {
    console.error('Error getting user rides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rides',
    } as ErrorResponse);
  }
});

export default router;
