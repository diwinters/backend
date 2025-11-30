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
    const { did, platform, token, appId }: RegisterDeviceRequest = req.body;

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

    // Ensure user exists
    const userResult = await pool.query(
      `INSERT INTO users (did, user_type, is_active)
       VALUES ($1, 'rider', true)
       ON CONFLICT (did) DO UPDATE SET is_active = true
       RETURNING id`,
      [did]
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

export default router;
