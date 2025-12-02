import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateAdmin } from './admin';

const router = Router();

// =============================================================================
// Public Routes (for mobile app)
// =============================================================================

/**
 * GET /api/cities
 * Get all active cities (public endpoint for mobile app)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, slug, name, name_ar, country_code, timezone, currency,
        center_lat, center_lng, default_zoom, boundary, modules,
        cover_image_url, icon_url, primary_color,
        is_active, is_default, is_coming_soon, launch_date, sort_order
       FROM cities 
       WHERE is_active = true OR is_coming_soon = true
       ORDER BY sort_order ASC, name ASC`
    );
    
    res.json({ 
      success: true,
      cities: result.rows 
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cities' });
  }
});

/**
 * GET /api/cities/detect
 * Detect city from coordinates
 */
router.get('/detect', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing lat or lng query parameters' 
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid coordinates' 
      });
    }

    // Try to find city containing the point
    // Using simple bounding box check first, then PostGIS if available
    let result = await pool.query(
      `SELECT 
        id, slug, name, name_ar, country_code, timezone, currency,
        center_lat, center_lng, default_zoom, boundary, modules,
        cover_image_url, icon_url, primary_color,
        is_active, is_default, is_coming_soon
       FROM cities 
       WHERE is_active = true
       ORDER BY 
         -- Calculate distance to center (simple approximation)
         POWER(center_lat - $1, 2) + POWER(center_lng - $2, 2) ASC
       LIMIT 1`,
      [latitude, longitude]
    );

    if (result.rows.length === 0) {
      // Fallback to default city
      result = await pool.query(
        `SELECT 
          id, slug, name, name_ar, country_code, timezone, currency,
          center_lat, center_lng, default_zoom, boundary, modules,
          cover_image_url, icon_url, primary_color,
          is_active, is_default, is_coming_soon
         FROM cities 
         WHERE is_default = true AND is_active = true
         LIMIT 1`
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No cities configured' 
      });
    }

    res.json({ 
      success: true,
      city: result.rows[0] 
    });
  } catch (error) {
    console.error('Error detecting city:', error);
    res.status(500).json({ success: false, error: 'Failed to detect city' });
  }
});

/**
 * GET /api/cities/:slug
 * Get a specific city by slug (public)
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query(
      `SELECT 
        id, slug, name, name_ar, country_code, timezone, currency,
        center_lat, center_lng, default_zoom, boundary, modules,
        cover_image_url, icon_url, primary_color,
        is_active, is_default, is_coming_soon, launch_date, sort_order
       FROM cities 
       WHERE slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'City not found' 
      });
    }

    res.json({ 
      success: true,
      city: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch city' });
  }
});

// =============================================================================
// Admin Routes
// =============================================================================

/**
 * GET /api/cities/admin/all
 * Get all cities including inactive (admin only)
 */
router.get('/admin/all', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM stays s WHERE s.city_id = c.id) as stays_count,
        (SELECT COUNT(*) FROM map_pills mp WHERE mp.city_id = c.id) as pills_count,
        (SELECT COUNT(*) FROM pricing_configurations pc WHERE pc.city_id = c.id) as pricing_count
       FROM cities c
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    
    res.json({ 
      success: true,
      cities: result.rows 
    });
  } catch (error) {
    console.error('Error fetching cities for admin:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cities' });
  }
});

/**
 * GET /api/cities/admin/stats
 * Get city statistics for dashboard
 */
router.get('/admin/stats', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.slug,
        c.name,
        c.is_active,
        c.modules,
        COALESCE((
          SELECT COUNT(*) FROM driver_locations dl 
          WHERE dl.is_available = true
        ), 0) as online_drivers,
        COALESCE((
          SELECT COUNT(*) FROM rides r 
          WHERE r.status IN ('pending', 'offered', 'accepted', 'in_progress')
        ), 0) as active_rides,
        COALESCE((
          SELECT COUNT(*) FROM rides r 
          WHERE r.status = 'completed'
          AND DATE(r.completed_at) = CURRENT_DATE
        ), 0) as completed_today,
        COALESCE((
          SELECT SUM(r.final_price) FROM rides r 
          WHERE r.status = 'completed'
          AND DATE(r.completed_at) = CURRENT_DATE
        ), 0) as revenue_today,
        COALESCE((SELECT COUNT(*) FROM stays s WHERE s.city_id = c.id AND s.is_active = true), 0) as active_stays,
        COALESCE((SELECT COUNT(*) FROM map_pills mp WHERE mp.city_id = c.id AND mp.is_active = true), 0) as map_pills
      FROM cities c
      WHERE c.is_active = true
      ORDER BY c.sort_order ASC
    `);
    
    res.json({ 
      success: true,
      stats: result.rows 
    });
  } catch (error) {
    console.error('Error fetching city stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch city stats' });
  }
});

/**
 * POST /api/cities/admin
 * Create a new city (admin only)
 */
router.post('/admin', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const {
      slug,
      name,
      name_ar,
      country_code = 'MA',
      timezone = 'Africa/Casablanca',
      currency = 'DH',
      center_lat,
      center_lng,
      default_zoom = 13,
      boundary,
      modules,
      settings,
      cover_image_url,
      icon_url,
      primary_color = '#3B82F6',
      is_active = false,
      is_default = false,
      is_coming_soon = false,
      launch_date,
      sort_order = 0,
    } = req.body;

    // Validate required fields
    if (!slug || !name || center_lat === undefined || center_lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: slug, name, center_lat, center_lng',
      });
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        success: false,
        error: 'Slug must be lowercase alphanumeric with hyphens only',
      });
    }

    const result = await pool.query(
      `INSERT INTO cities (
        slug, name, name_ar, country_code, timezone, currency,
        center_lat, center_lng, default_zoom, boundary, modules, settings,
        cover_image_url, icon_url, primary_color,
        is_active, is_default, is_coming_soon, launch_date, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        slug, name, name_ar, country_code, timezone, currency,
        center_lat, center_lng, default_zoom,
        boundary ? JSON.stringify(boundary) : null,
        modules ? JSON.stringify(modules) : '{"rides":{"enabled":true},"stays":{"enabled":true},"shop":{"enabled":false},"pharmacy":{"enabled":false},"content":{"enabled":true}}',
        settings ? JSON.stringify(settings) : '{}',
        cover_image_url, icon_url, primary_color,
        is_active, is_default, is_coming_soon, launch_date, sort_order,
      ]
    );

    res.status(201).json({
      success: true,
      city: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'City with this slug already exists',
      });
    }
    console.error('Error creating city:', error);
    res.status(500).json({ success: false, error: 'Failed to create city' });
  }
});

/**
 * PUT /api/cities/admin/:id
 * Update a city (admin only)
 */
router.put('/admin/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = [
      'slug', 'name', 'name_ar', 'country_code', 'timezone', 'currency',
      'center_lat', 'center_lng', 'default_zoom', 'boundary', 'modules', 'settings',
      'cover_image_url', 'icon_url', 'primary_color',
      'is_active', 'is_default', 'is_coming_soon', 'launch_date', 'sort_order',
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (['boundary', 'modules', 'settings'].includes(field)) {
          setClauses.push(`${field} = $${paramIndex}`);
          values.push(JSON.stringify(updates[field]));
        } else {
          setClauses.push(`${field} = $${paramIndex}`);
          values.push(updates[field]);
        }
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    values.push(id);
    const query = `
      UPDATE cities 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
      });
    }

    res.json({
      success: true,
      city: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'City with this slug already exists',
      });
    }
    console.error('Error updating city:', error);
    res.status(500).json({ success: false, error: 'Failed to update city' });
  }
});

/**
 * DELETE /api/cities/admin/:id
 * Delete a city (admin only)
 */
router.delete('/admin/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if city is default
    const checkResult = await pool.query(
      'SELECT is_default FROM cities WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
      });
    }

    if (checkResult.rows[0].is_default) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default city',
      });
    }

    await pool.query('DELETE FROM cities WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'City deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting city:', error);
    res.status(500).json({ success: false, error: 'Failed to delete city' });
  }
});

/**
 * PUT /api/cities/admin/:id/modules
 * Update city modules configuration
 */
router.put('/admin/:id/modules', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modules } = req.body;

    if (!modules) {
      return res.status(400).json({
        success: false,
        error: 'Modules configuration is required',
      });
    }

    const result = await pool.query(
      `UPDATE cities 
       SET modules = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(modules), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
      });
    }

    res.json({
      success: true,
      city: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating city modules:', error);
    res.status(500).json({ success: false, error: 'Failed to update modules' });
  }
});

/**
 * PUT /api/cities/admin/:id/boundary
 * Update city boundary polygon
 */
router.put('/admin/:id/boundary', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { boundary } = req.body;

    if (!boundary || boundary.type !== 'Polygon' || !boundary.coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Valid GeoJSON Polygon boundary is required',
      });
    }

    const result = await pool.query(
      `UPDATE cities 
       SET boundary = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(boundary), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
      });
    }

    res.json({
      success: true,
      city: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating city boundary:', error);
    res.status(500).json({ success: false, error: 'Failed to update boundary' });
  }
});

export default router;
