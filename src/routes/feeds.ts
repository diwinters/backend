import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateAdmin } from './admin';

const router = Router();

/**
 * GET /api/feeds
 * Get all active pinned feeds (public endpoint for app)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city_id } = req.query;
    
    let query = `
      SELECT id, name, name_ar, feed_uri, feed_type, description, description_ar,
             icon, color, sort_order, is_pinned, is_default, is_active, city_id
      FROM feeds
      WHERE is_active = true AND is_pinned = true
    `;
    const params: any[] = [];
    
    if (city_id) {
      query += ` AND (city_id = $1 OR city_id IS NULL)`;
      params.push(city_id);
    } else {
      query += ` AND city_id IS NULL`;
    }
    
    query += ` ORDER BY sort_order ASC, id ASC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      feeds: result.rows,
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
});

/**
 * GET /api/feeds/admin
 * Get all feeds for admin (requires auth)
 */
router.get('/admin', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT f.*, c.name as city_name, a.name as created_by_name
      FROM feeds f
      LEFT JOIN cities c ON f.city_id = c.id
      LEFT JOIN admin_users a ON f.created_by = a.id
      ORDER BY f.sort_order ASC, f.id ASC
    `);
    
    res.json({
      success: true,
      feeds: result.rows,
    });
  } catch (error) {
    console.error('Error fetching feeds for admin:', error);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
});

/**
 * GET /api/feeds/:id
 * Get single feed by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM feeds WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    res.json({
      success: true,
      feed: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * POST /api/feeds
 * Create a new feed (admin only)
 */
router.post('/', authenticateAdmin, async (req: any, res: Response) => {
  try {
    const {
      name,
      name_ar,
      feed_uri,
      feed_type = 'custom',
      description,
      description_ar,
      icon = 'hashtag',
      color = '#3B82F6',
      sort_order = 0,
      is_pinned = true,
      is_default = false,
      is_active = true,
      city_id,
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Feed name is required' });
    }
    
    // If this feed is set as default, unset other defaults
    if (is_default) {
      await pool.query(`UPDATE feeds SET is_default = false WHERE city_id IS NOT DISTINCT FROM $1`, [city_id || null]);
    }
    
    const result = await pool.query(
      `INSERT INTO feeds (name, name_ar, feed_uri, feed_type, description, description_ar, 
                          icon, color, sort_order, is_pinned, is_default, is_active, city_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [name, name_ar, feed_uri, feed_type, description, description_ar,
       icon, color, sort_order, is_pinned, is_default, is_active, city_id || null, req.admin?.id]
    );
    
    res.status(201).json({
      success: true,
      feed: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating feed:', error);
    res.status(500).json({ error: 'Failed to create feed' });
  }
});

/**
 * PUT /api/feeds/:id
 * Update a feed (admin only)
 */
router.put('/:id', authenticateAdmin, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      name_ar,
      feed_uri,
      feed_type,
      description,
      description_ar,
      icon,
      color,
      sort_order,
      is_pinned,
      is_default,
      is_active,
      city_id,
    } = req.body;
    
    // Get current feed to check city_id
    const currentFeed = await pool.query(`SELECT * FROM feeds WHERE id = $1`, [id]);
    if (currentFeed.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    const feedCityId = city_id !== undefined ? city_id : currentFeed.rows[0].city_id;
    
    // If this feed is set as default, unset other defaults
    if (is_default) {
      await pool.query(
        `UPDATE feeds SET is_default = false WHERE id != $1 AND city_id IS NOT DISTINCT FROM $2`,
        [id, feedCityId]
      );
    }
    
    const result = await pool.query(
      `UPDATE feeds SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        feed_uri = COALESCE($3, feed_uri),
        feed_type = COALESCE($4, feed_type),
        description = COALESCE($5, description),
        description_ar = COALESCE($6, description_ar),
        icon = COALESCE($7, icon),
        color = COALESCE($8, color),
        sort_order = COALESCE($9, sort_order),
        is_pinned = COALESCE($10, is_pinned),
        is_default = COALESCE($11, is_default),
        is_active = COALESCE($12, is_active),
        city_id = $13
       WHERE id = $14
       RETURNING *`,
      [name, name_ar, feed_uri, feed_type, description, description_ar,
       icon, color, sort_order, is_pinned, is_default, is_active, feedCityId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    res.json({
      success: true,
      feed: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating feed:', error);
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

/**
 * DELETE /api/feeds/:id
 * Delete a feed (admin only)
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM feeds WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    res.json({
      success: true,
      message: 'Feed deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feed:', error);
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

/**
 * POST /api/feeds/:id/toggle
 * Toggle feed active status (admin only)
 */
router.post('/:id/toggle', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE feeds SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    res.json({
      success: true,
      feed: result.rows[0],
    });
  } catch (error) {
    console.error('Error toggling feed:', error);
    res.status(500).json({ error: 'Failed to toggle feed' });
  }
});

/**
 * POST /api/feeds/:id/toggle-pinned
 * Toggle feed pinned status (admin only)
 */
router.post('/:id/toggle-pinned', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE feeds SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    res.json({
      success: true,
      feed: result.rows[0],
    });
  } catch (error) {
    console.error('Error toggling feed pinned:', error);
    res.status(500).json({ error: 'Failed to toggle feed pinned status' });
  }
});

/**
 * POST /api/feeds/reorder
 * Reorder feeds (admin only)
 */
router.post('/reorder', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { feeds } = req.body; // Array of { id, sort_order }
    
    if (!Array.isArray(feeds)) {
      return res.status(400).json({ error: 'Invalid feeds array' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const feed of feeds) {
        await client.query(
          `UPDATE feeds SET sort_order = $1 WHERE id = $2`,
          [feed.sort_order, feed.id]
        );
      }
      
      await client.query('COMMIT');
      
      // Fetch updated feeds
      const result = await client.query(
        `SELECT * FROM feeds ORDER BY sort_order ASC, id ASC`
      );
      
      res.json({
        success: true,
        feeds: result.rows,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering feeds:', error);
    res.status(500).json({ error: 'Failed to reorder feeds' });
  }
});

/**
 * POST /api/feeds/:id/set-default
 * Set a feed as the default (admin only)
 */
router.post('/:id/set-default', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the feed's city_id
    const feedResult = await pool.query(`SELECT city_id FROM feeds WHERE id = $1`, [id]);
    if (feedResult.rows.length === 0) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    const cityId = feedResult.rows[0].city_id;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Unset all other defaults for this city
      await client.query(
        `UPDATE feeds SET is_default = false WHERE city_id IS NOT DISTINCT FROM $1`,
        [cityId]
      );
      
      // Set this feed as default
      const result = await client.query(
        `UPDATE feeds SET is_default = true WHERE id = $1 RETURNING *`,
        [id]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        feed: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error setting default feed:', error);
    res.status(500).json({ error: 'Failed to set default feed' });
  }
});

export default router;
