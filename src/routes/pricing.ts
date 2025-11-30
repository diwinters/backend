import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateAdmin } from './admin';

const router = Router();

/**
 * GET /api/pricing
 * Get all pricing configurations
 */
router.get('/', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_configurations ORDER BY name ASC'
    );
    res.json({ success: true, configs: result.rows });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing configurations' });
  }
});

/**
 * GET /api/pricing/:citySlug
 * Get specific city pricing
 */
router.get('/:citySlug', async (req: Request, res: Response) => {
  try {
    const { citySlug } = req.params;
    const result = await pool.query(
      'SELECT * FROM pricing_configurations WHERE city_slug = $1',
      [citySlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City configuration not found' });
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Get city pricing error:', error);
    res.status(500).json({ error: 'Failed to get city pricing' });
  }
});

/**
 * PUT /api/pricing/:citySlug
 * Update pricing configuration
 */
router.put('/:citySlug', authenticateAdmin, async (req: any, res: Response) => {
  try {
    const { citySlug } = req.params;
    const { config, name, currency, timezone, is_active } = req.body;

    // Validate JSON config structure (basic check)
    if (!config || !config.ride || !config.delivery) {
      return res.status(400).json({ error: 'Invalid configuration structure' });
    }

    const result = await pool.query(
      `UPDATE pricing_configurations 
       SET config = $1, 
           name = COALESCE($2, name),
           currency = COALESCE($3, currency),
           timezone = COALESCE($4, timezone),
           is_active = COALESCE($5, is_active),
           updated_at = NOW(),
           updated_by = $6
       WHERE city_slug = $7
       RETURNING *`,
      [config, name, currency, timezone, is_active, req.admin.id, citySlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City configuration not found' });
    }

    // Clear cache (if we implement one later)
    // pricingCache.del(citySlug);

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

/**
 * POST /api/pricing
 * Create new city pricing
 */
router.post('/', authenticateAdmin, async (req: any, res: Response) => {
  try {
    const { citySlug, name, currency, timezone, config } = req.body;

    if (!citySlug || !name || !config) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO pricing_configurations 
       (city_slug, name, currency, timezone, config, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [citySlug, name, currency || 'DH', timezone || 'Africa/Casablanca', config, req.admin.id]
    );

    res.status(201).json({ success: true, config: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'City slug already exists' });
    }
    console.error('Create pricing error:', error);
    res.status(500).json({ error: 'Failed to create pricing configuration' });
  }
});

export default router;
