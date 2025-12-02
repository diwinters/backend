import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateAdmin } from './admin';

const router = Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * GET /api/map-pills
 * Get all active pills with their places (public)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const pillsResult = await pool.query(
      `SELECT id, name, name_ar, icon, color, sort_order
       FROM map_pills 
       WHERE is_active = true 
       ORDER BY sort_order ASC, name ASC`
    );

    const pills = pillsResult.rows;

    // Get places for each pill
    for (const pill of pills) {
      const placesResult = await pool.query(
        `SELECT id, name, name_ar, description, latitude, longitude, 
                zone_geojson, zone_fill_color, zone_stroke_color, zone_stroke_width,
                marker_icon, marker_color, place_type, sort_order
         FROM map_places 
         WHERE pill_id = $1 AND is_active = true 
         ORDER BY sort_order ASC, name ASC`,
        [pill.id]
      );
      pill.places = placesResult.rows.map(place => ({
        ...place,
        latitude: place.latitude ? parseFloat(place.latitude) : null,
        longitude: place.longitude ? parseFloat(place.longitude) : null,
        zone_stroke_width: place.zone_stroke_width ? parseFloat(place.zone_stroke_width) : 2,
      }));
    }

    res.json({ pills });
  } catch (error) {
    console.error('Error fetching map pills:', error);
    res.status(500).json({ error: 'Failed to fetch map pills' });
  }
});

/**
 * GET /api/map-pills/:id/places
 * Get places for a specific pill (public)
 */
router.get('/:id/places', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, name_ar, description, latitude, longitude, 
              zone_geojson, zone_fill_color, zone_stroke_color, zone_stroke_width,
              marker_icon, marker_color, place_type, sort_order
       FROM map_places 
       WHERE pill_id = $1 AND is_active = true 
       ORDER BY sort_order ASC, name ASC`,
      [id]
    );

    const places = result.rows.map(place => ({
      ...place,
      latitude: place.latitude ? parseFloat(place.latitude) : null,
      longitude: place.longitude ? parseFloat(place.longitude) : null,
      zone_stroke_width: place.zone_stroke_width ? parseFloat(place.zone_stroke_width) : 2,
    }));

    res.json({ places });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/map-pills/admin
 * Get all pills with places (admin)
 */
router.get('/admin', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const pillsResult = await pool.query(
      `SELECT * FROM map_pills ORDER BY sort_order ASC, name ASC`
    );

    const pills = pillsResult.rows;

    for (const pill of pills) {
      const placesResult = await pool.query(
        `SELECT * FROM map_places WHERE pill_id = $1 ORDER BY sort_order ASC, name ASC`,
        [pill.id]
      );
      pill.places = placesResult.rows.map(place => ({
        ...place,
        latitude: place.latitude ? parseFloat(place.latitude) : null,
        longitude: place.longitude ? parseFloat(place.longitude) : null,
        zone_stroke_width: place.zone_stroke_width ? parseFloat(place.zone_stroke_width) : 2,
      }));
    }

    res.json({ pills });
  } catch (error) {
    console.error('Error fetching admin pills:', error);
    res.status(500).json({ error: 'Failed to fetch pills' });
  }
});

/**
 * POST /api/map-pills
 * Create a new pill (admin)
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, name_ar, icon, color, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO map_pills (name, name_ar, icon, color, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [name.trim(), name_ar?.trim() || null, icon || 'map-pin', color || '#3B82F6', sort_order || 0]
    );

    const pill = result.rows[0];
    pill.places = [];

    res.status(201).json(pill);
  } catch (error) {
    console.error('Error creating pill:', error);
    res.status(500).json({ error: 'Failed to create pill' });
  }
});

/**
 * PUT /api/map-pills/:id
 * Update a pill (admin)
 */
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, name_ar, icon, color, sort_order, is_active } = req.body;

    const result = await pool.query(
      `UPDATE map_pills 
       SET name = COALESCE($1, name),
           name_ar = COALESCE($2, name_ar),
           icon = COALESCE($3, icon),
           color = COALESCE($4, color),
           sort_order = COALESCE($5, sort_order),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [name?.trim(), name_ar?.trim(), icon, color, sort_order, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pill not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pill:', error);
    res.status(500).json({ error: 'Failed to update pill' });
  }
});

/**
 * DELETE /api/map-pills/:id
 * Delete a pill and all its places (admin)
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM map_pills WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pill not found' });
    }

    res.json({ message: 'Pill deleted successfully' });
  } catch (error) {
    console.error('Error deleting pill:', error);
    res.status(500).json({ error: 'Failed to delete pill' });
  }
});

/**
 * POST /api/map-pills/:id/toggle
 * Toggle pill active status (admin)
 */
router.post('/:id/toggle', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE map_pills SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pill not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling pill:', error);
    res.status(500).json({ error: 'Failed to toggle pill' });
  }
});

// ==================== PLACES ENDPOINTS ====================

/**
 * POST /api/map-pills/:pillId/places
 * Add a place to a pill (admin)
 */
router.post('/:pillId/places', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { pillId } = req.params;
    const {
      name, name_ar, description,
      latitude, longitude,
      zone_geojson,
      zone_fill_color, zone_stroke_color, zone_stroke_width,
      marker_icon, marker_color,
      place_type, sort_order
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const type = place_type || 'point';
    
    if (type === 'point' && (latitude === undefined || longitude === undefined)) {
      return res.status(400).json({ error: 'Latitude and longitude are required for point type' });
    }
    
    if (type === 'zone' && !zone_geojson) {
      return res.status(400).json({ error: 'Zone GeoJSON is required for zone type' });
    }

    const result = await pool.query(
      `INSERT INTO map_places (
        pill_id, name, name_ar, description,
        latitude, longitude, zone_geojson,
        zone_fill_color, zone_stroke_color, zone_stroke_width,
        marker_icon, marker_color, place_type, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING *`,
      [
        pillId, name.trim(), name_ar?.trim() || null, description?.trim() || null,
        type === 'point' ? latitude : null,
        type === 'point' ? longitude : null,
        type === 'zone' ? JSON.stringify(zone_geojson) : null,
        zone_fill_color || '#3B82F680',
        zone_stroke_color || '#3B82F6',
        zone_stroke_width || 2,
        marker_icon || 'map-pin',
        marker_color || '#3B82F6',
        type,
        sort_order || 0
      ]
    );

    const place = result.rows[0];
    place.latitude = place.latitude ? parseFloat(place.latitude) : null;
    place.longitude = place.longitude ? parseFloat(place.longitude) : null;

    res.status(201).json(place);
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(500).json({ error: 'Failed to create place' });
  }
});

/**
 * PUT /api/map-pills/places/:id
 * Update a place (admin)
 */
router.put('/places/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, name_ar, description,
      latitude, longitude,
      zone_geojson,
      zone_fill_color, zone_stroke_color, zone_stroke_width,
      marker_icon, marker_color,
      place_type, sort_order, is_active
    } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (name_ar !== undefined) {
      updates.push(`name_ar = $${paramIndex++}`);
      values.push(name_ar?.trim() || null);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramIndex++}`);
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramIndex++}`);
      values.push(longitude);
    }
    if (zone_geojson !== undefined) {
      updates.push(`zone_geojson = $${paramIndex++}`);
      values.push(zone_geojson ? JSON.stringify(zone_geojson) : null);
    }
    if (zone_fill_color !== undefined) {
      updates.push(`zone_fill_color = $${paramIndex++}`);
      values.push(zone_fill_color);
    }
    if (zone_stroke_color !== undefined) {
      updates.push(`zone_stroke_color = $${paramIndex++}`);
      values.push(zone_stroke_color);
    }
    if (zone_stroke_width !== undefined) {
      updates.push(`zone_stroke_width = $${paramIndex++}`);
      values.push(zone_stroke_width);
    }
    if (marker_icon !== undefined) {
      updates.push(`marker_icon = $${paramIndex++}`);
      values.push(marker_icon);
    }
    if (marker_color !== undefined) {
      updates.push(`marker_color = $${paramIndex++}`);
      values.push(marker_color);
    }
    if (place_type !== undefined) {
      updates.push(`place_type = $${paramIndex++}`);
      values.push(place_type);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sort_order);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE map_places SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const place = result.rows[0];
    place.latitude = place.latitude ? parseFloat(place.latitude) : null;
    place.longitude = place.longitude ? parseFloat(place.longitude) : null;

    res.json(place);
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(500).json({ error: 'Failed to update place' });
  }
});

/**
 * DELETE /api/map-pills/places/:id
 * Delete a place (admin)
 */
router.delete('/places/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM map_places WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json({ message: 'Place deleted successfully' });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ error: 'Failed to delete place' });
  }
});

/**
 * POST /api/map-pills/places/:id/toggle
 * Toggle place active status (admin)
 */
router.post('/places/:id/toggle', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE map_places SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const place = result.rows[0];
    place.latitude = place.latitude ? parseFloat(place.latitude) : null;
    place.longitude = place.longitude ? parseFloat(place.longitude) : null;

    res.json(place);
  } catch (error) {
    console.error('Error toggling place:', error);
    res.status(500).json({ error: 'Failed to toggle place' });
  }
});

export default router;
