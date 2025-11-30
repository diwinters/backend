import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { getWebSocketStats } from '../services/websocket.service';
import { getUserProfileByDID, isValidDID } from '../services/plc-directory.service';

const router = Router();

// JWT Secret - should be in env variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'raceef-admin-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Types
interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface AuthRequest extends Request {
  admin?: AdminUser;
}

// Middleware to verify JWT token
export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };

    // Get admin user from database
    const result = await pool.query(
      'SELECT id, email, name, role, is_active FROM admin_users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * POST /api/admin/login
 * Admin login with email/password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find admin user
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, is_active FROM admin_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Log activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, ip_address) 
       VALUES ($1, 'login', $2)`,
      [admin.id, req.ip]
    );

    console.log(`[Admin] Login successful: ${admin.email}`);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/admin/logout
 * Admin logout (client should discard token)
 */
router.post('/logout', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Log activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, ip_address) 
       VALUES ($1, 'logout', $2)`,
      [req.admin?.id, req.ip]
    );

    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/admin/me
 * Get current admin user info
 */
router.get('/me', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    admin: req.admin,
  });
});

/**
 * POST /api/admin/create
 * Create new admin user (superadmin only)
 */
router.post('/create', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (req.admin?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can create users' });
    }

    const { email, password, name, role = 'admin' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role`,
      [email.toLowerCase(), passwordHash, name, role]
    );

    // Log activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, ip_address) 
       VALUES ($1, 'create_admin', 'admin_user', $2, $3)`,
      [req.admin.id, result.rows[0].id, req.ip]
    );

    res.json({
      success: true,
      admin: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

/**
 * PUT /api/admin/password
 * Change own password
 */
router.put('/password', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [req.admin?.id]
    );

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.admin?.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, ip_address) 
       VALUES ($1, 'change_password', $2)`,
      [req.admin?.id, req.ip]
    );

    res.json({ success: true, message: 'Password changed' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// DASHBOARD STATISTICS ENDPOINTS
// ============================================

/**
 * GET /api/admin/stats/overview
 * Get dashboard overview stats
 */
router.get('/stats/overview', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    // Get counts in parallel
    const [
      totalRides,
      activeRides,
      completedToday,
      totalUsers,
      totalDrivers,
      onlineDrivers,
      pendingRides,
      revenueToday,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM rides'),
      pool.query("SELECT COUNT(*) FROM rides WHERE status IN ('pending', 'offered', 'accepted', 'driver_arrived', 'in_progress')"),
      pool.query("SELECT COUNT(*) FROM rides WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE"),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM users WHERE user_type IN ('driver', 'both')"),
      pool.query('SELECT COUNT(*) FROM driver_locations WHERE is_available = true'),
      pool.query("SELECT COUNT(*) FROM rides WHERE status IN ('pending', 'offered')"),
      pool.query("SELECT COALESCE(SUM(final_price), 0) as revenue FROM rides WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE"),
    ]);

    res.json({
      success: true,
      stats: {
        totalRides: parseInt(totalRides.rows[0].count),
        activeRides: parseInt(activeRides.rows[0].count),
        completedToday: parseInt(completedToday.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalDrivers: parseInt(totalDrivers.rows[0].count),
        onlineDrivers: parseInt(onlineDrivers.rows[0].count),
        pendingRides: parseInt(pendingRides.rows[0].count),
        revenueToday: parseFloat(revenueToday.rows[0].revenue),
      },
    });
  } catch (error) {
    console.error('Stats overview error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/admin/stats/rides
 * Get ride statistics by time period
 */
router.get('/stats/rides', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COALESCE(SUM(final_price) FILTER (WHERE status = 'completed'), 0) as revenue
      FROM rides
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      stats: result.rows,
    });
  } catch (error) {
    console.error('Stats rides error:', error);
    res.status(500).json({ error: 'Failed to get ride stats' });
  }
});

// ============================================
// DATA MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/admin/rides
 * Get paginated rides list with filters
 */
router.get('/rides', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (r.pickup_address ILIKE $${params.length} OR r.dropoff_address ILIKE $${params.length} OR r.id::text ILIKE $${params.length})`;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM rides r ${whereClause}`,
      params
    );

    // Get rides with user info
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT r.*, 
              u1.display_name as rider_name,
              u1.avatar_url as rider_avatar,
              u1.phone as rider_phone,
              u1.user_type as rider_type,
              u2.display_name as driver_name,
              u2.avatar_url as driver_avatar,
              u2.phone as driver_phone,
              u2.user_type as driver_type
       FROM rides r
       LEFT JOIN users u1 ON r.rider_did = u1.did
       LEFT JOIN users u2 ON r.driver_did = u2.did
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
    console.error('Get rides error:', error);
    res.status(500).json({ error: 'Failed to get rides' });
  }
});

/**
 * GET /api/admin/rides/:id
 * Get single ride details with full history
 */
router.get('/rides/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [ride, history] = await Promise.all([
      pool.query(
        `SELECT r.*, 
                u1.display_name as rider_name, u1.phone as rider_phone, u1.avatar_url as rider_avatar, u1.user_type as rider_type,
                u2.display_name as driver_name, u2.phone as driver_phone, u2.avatar_url as driver_avatar, u2.user_type as driver_type
         FROM rides r
         LEFT JOIN users u1 ON r.rider_did = u1.did
         LEFT JOIN users u2 ON r.driver_did = u2.did
         WHERE r.id = $1`,
        [id]
      ),
      pool.query(
        'SELECT * FROM ride_history WHERE ride_id = $1 ORDER BY changed_at ASC',
        [id]
      ),
    ]);

    if (ride.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json({
      success: true,
      ride: ride.rows[0],
      history: history.rows,
    });
  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({ error: 'Failed to get ride' });
  }
});

/**
 * GET /api/admin/drivers
 * Get all drivers with status
 */
router.get('/drivers', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const online = req.query.online as string;

    let query = `
      SELECT u.did, u.display_name as name, u.phone, u.avatar_url as avatar, u.user_type, u.created_at,
             dl.latitude, dl.longitude, dl.is_available, dl.updated_at as last_location_update,
             (SELECT COUNT(*) FROM rides WHERE driver_did = u.did AND status = 'completed') as completed_rides,
             (SELECT COUNT(*) FROM rides WHERE driver_did = u.did AND status IN ('accepted', 'driver_arrived', 'in_progress')) as active_ride
      FROM users u
      LEFT JOIN driver_locations dl ON u.did = dl.driver_did
      WHERE u.user_type IN ('driver', 'both')
    `;

    const params: any[] = [];

    if (online === 'true') {
      query += ' AND dl.is_available = true';
    } else if (online === 'false') {
      query += ' AND (dl.is_available = false OR dl.is_available IS NULL)';
    }

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u 
       LEFT JOIN driver_locations dl ON u.did = dl.driver_did
       WHERE u.user_type IN ('driver', 'both')
       ${online === 'true' ? 'AND dl.is_available = true' : online === 'false' ? 'AND (dl.is_available = false OR dl.is_available IS NULL)' : ''}`
    );

    query += ` ORDER BY dl.is_available DESC NULLS LAST, u.created_at DESC LIMIT $1 OFFSET $2`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Enhance driver data with full user info
    const driversWithInfo = result.rows.map(driver => ({
      ...driver,
      user_info: {
        did: driver.did,
        display_name: driver.name,
        avatar_url: driver.avatar,
        phone: driver.phone,
        user_type: driver.user_type,
      }
    }));

    res.json({
      success: true,
      drivers: driversWithInfo,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to get drivers' });
  }
});

/**
 * GET /api/admin/drivers/locations
 * Get all online driver locations (for map)
 */
router.get('/drivers/locations', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dl.driver_did, dl.latitude, dl.longitude, dl.heading, dl.speed, dl.updated_at,
             u.display_name as name, u.avatar_url as avatar, u.phone, u.user_type
      FROM driver_locations dl
      JOIN users u ON dl.driver_did = u.did
      WHERE dl.is_available = true
        AND dl.updated_at > NOW() - INTERVAL '10 minutes'
    `);

    res.json({
      success: true,
      drivers: result.rows,
    });
  } catch (error) {
    console.error('Get driver locations error:', error);
    res.status(500).json({ error: 'Failed to get driver locations' });
  }
});

/**
 * GET /api/admin/users
 * Get all users (riders)
 */
router.get('/users', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (u.display_name ILIKE $${params.length} OR u.did ILIKE $${params.length} OR u.phone ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT u.did, u.display_name as name, u.phone, u.avatar_url as avatar, u.user_type, u.is_active, u.created_at, u.updated_at,
              (SELECT COUNT(*) FROM rides WHERE rider_did = u.did) as total_rides,
              (SELECT COUNT(*) FROM rides WHERE rider_did = u.did AND status = 'completed') as completed_rides,
              (SELECT COUNT(*) FROM rides WHERE driver_did = u.did) as total_drives,
              (SELECT COUNT(*) FROM rides WHERE driver_did = u.did AND status = 'completed') as completed_drives
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * POST /api/admin/rides/:id/assign
 * Manually assign driver to ride
 */
router.post('/rides/:id/assign', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { driverDid } = req.body;

    if (!driverDid) {
      return res.status(400).json({ error: 'Driver DID required' });
    }

    // Check ride exists and is assignable
    const rideResult = await pool.query(
      "SELECT * FROM rides WHERE id = $1 AND status IN ('pending', 'offered')",
      [id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found or cannot be assigned' });
    }

    // Check driver exists
    const driverResult = await pool.query(
      "SELECT * FROM users WHERE did = $1 AND user_type IN ('driver', 'both')",
      [driverDid]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Assign driver
    await pool.query(
      "UPDATE rides SET driver_did = $1, status = 'accepted', accepted_at = NOW() WHERE id = $2",
      [driverDid, id]
    );

    // Log history
    await pool.query(
      `INSERT INTO ride_history (ride_id, status, changed_by, notes) 
       VALUES ($1, 'accepted', $2, 'Manually assigned by admin')`,
      [id, req.admin?.email]
    );

    // Log admin activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details, ip_address) 
       VALUES ($1, 'assign_ride', 'ride', $2, $3, $4)`,
      [req.admin?.id, id, JSON.stringify({ driverDid }), req.ip]
    );

    res.json({ success: true, message: 'Driver assigned' });
  } catch (error) {
    console.error('Assign ride error:', error);
    res.status(500).json({ error: 'Failed to assign ride' });
  }
});

/**
 * POST /api/admin/rides/:id/cancel
 * Admin cancel ride
 */
router.post('/rides/:id/cancel', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      "UPDATE rides SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1 WHERE id = $2",
      [reason || 'Cancelled by admin', id]
    );

    // Log history
    await pool.query(
      `INSERT INTO ride_history (ride_id, status, changed_by, notes) 
       VALUES ($1, 'cancelled', $2, $3)`,
      [id, req.admin?.email, reason || 'Cancelled by admin']
    );

    res.json({ success: true, message: 'Ride cancelled' });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
});

// ============================================
// DEBUG ENDPOINTS
// ============================================

/**
 * GET /api/admin/debug/websocket
 * Get WebSocket connection status
 */
router.get('/debug/websocket', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = getWebSocketStats();
    res.json({
      success: true,
      websocket: stats,
    });
  } catch (error) {
    console.error('WebSocket stats error:', error);
    res.status(500).json({ error: 'Failed to get WebSocket stats' });
  }
});

/**
 * GET /api/admin/debug/notifications
 * Get recent notification logs
 */
router.get('/debug/notifications', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT ud.device_token, ud.platform, ud.is_active, ud.last_seen,
             u.did, u.display_name as name
      FROM user_devices ud
      JOIN users u ON ud.user_id = u.id
      ORDER BY ud.last_seen DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      devices: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Debug notifications error:', error);
    res.status(500).json({ error: 'Failed to get notification debug info' });
  }
});

/**
 * GET /api/admin/debug/health
 * System health check
 */
router.get('/debug/health', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    // Check database
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    // Get database stats
    const dbStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM rides) as total_rides,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM driver_locations WHERE is_available = true) as online_drivers,
        (SELECT COUNT(*) FROM user_devices WHERE is_active = true) as active_devices
    `);

    res.json({
      success: true,
      health: {
        database: {
          status: 'healthy',
          latency: dbLatency + 'ms',
        },
        stats: dbStats.rows[0],
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      health: {
        database: { status: 'unhealthy' },
        error: 'Health check failed',
      },
    });
  }
});

/**
 * POST /api/admin/drivers/approve
 * Approve a user as driver or livreur
 */
router.post('/drivers/approve', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { did, driverRole } = req.body;

    // Validate input
    if (!did || !driverRole) {
      return res.status(400).json({ error: 'DID and driverRole required' });
    }

    if (!isValidDID(did)) {
      return res.status(400).json({ error: 'Invalid DID format' });
    }

    if (!['taxi', 'delivery'].includes(driverRole)) {
      return res.status(400).json({ error: 'driverRole must be taxi or delivery' });
    }

    // Fetch user profile from PLC Directory
    const profile = await getUserProfileByDID(did);
    if (!profile) {
      return res.status(404).json({ error: 'User not found in PLC Directory' });
    }

    // Determine user_type
    const userType = driverRole === 'delivery' ? 'livreur' : 'driver';

    // Create or update user with driver approval
    const result = await pool.query(
      `INSERT INTO users (did, display_name, user_type, driver_role, approved_driver, approved_by, approved_at, is_active)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), true)
       ON CONFLICT (did) DO UPDATE SET
         user_type = EXCLUDED.user_type,
         driver_role = EXCLUDED.driver_role,
         approved_driver = true,
         approved_by = EXCLUDED.approved_by,
         approved_at = NOW(),
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         updated_at = NOW()
       RETURNING id, did, display_name, user_type, driver_role, approved_driver`,
      [did, profile.handle || null, userType, driverRole, req.admin?.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'approve_driver', 'user', $2, $3, $4)`,
      [
        req.admin?.id,
        result.rows[0].id,
        JSON.stringify({ driverRole, handle: profile.handle }),
        req.ip,
      ]
    );

    res.json({
      success: true,
      user: result.rows[0],
      profile,
    });
  } catch (error) {
    console.error('Approve driver error:', error);
    res.status(500).json({ error: 'Failed to approve driver' });
  }
});

/**
 * POST /api/admin/drivers/revoke
 * Revoke driver approval
 */
router.post('/drivers/revoke', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { did } = req.body;

    if (!did) {
      return res.status(400).json({ error: 'DID required' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET approved_driver = false, 
           driver_role = NULL,
           updated_at = NOW()
       WHERE did = $1
       RETURNING id, did, display_name, user_type, approved_driver`,
      [did]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also set driver as unavailable
    await pool.query(
      `UPDATE driver_locations SET is_available = false WHERE driver_did = $1`,
      [did]
    );

    // Log activity
    await pool.query(
      `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'revoke_driver', 'user', $2, $3, $4)`,
      [req.admin?.id, result.rows[0].id, JSON.stringify({ did }), req.ip]
    );

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Revoke driver error:', error);
    res.status(500).json({ error: 'Failed to revoke driver approval' });
  }
});

export default router;
