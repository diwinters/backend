import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateAdmin } from './admin';

const router = Router();

/**
 * GET /api/medicines
 * Get all active medicines (public endpoint for client)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, limit = 50 } = req.query;
    
    let query = `
      SELECT id, name, price, quantity, category, description, requires_prescription, popularity
      FROM medicines 
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search && typeof search === 'string' && search.length >= 2) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category && typeof category === 'string') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    query += ` ORDER BY popularity DESC, name ASC LIMIT $${paramIndex}`;
    params.push(Number(limit));
    
    const result = await pool.query(query, params);
    
    res.json({ 
      medicines: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

/**
 * GET /api/medicines/categories
 * Get all medicine categories (public endpoint)
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, icon, sort_order 
       FROM medicine_categories 
       WHERE is_active = true 
       ORDER BY sort_order ASC`
    );
    
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/medicines/search
 * Search medicines with autocomplete (public endpoint)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ medicines: [] });
    }
    
    const result = await pool.query(
      `SELECT id, name, price, quantity, category, requires_prescription, popularity
       FROM medicines 
       WHERE is_active = true AND name ILIKE $1
       ORDER BY 
         CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
         popularity DESC,
         name ASC
       LIMIT $3`,
      [`%${q}%`, `${q}%`, Number(limit)]
    );
    
    res.json({ medicines: result.rows });
  } catch (error) {
    console.error('Error searching medicines:', error);
    res.status(500).json({ error: 'Failed to search medicines' });
  }
});

/**
 * GET /api/medicines/admin
 * Get all medicines for admin (includes inactive)
 * Requires admin authentication
 */
router.get('/admin', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search && typeof search === 'string' && search.length >= 1) {
      whereClause += `WHERE name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (category && typeof category === 'string') {
      whereClause += whereClause ? ` AND category = $${paramIndex}` : `WHERE category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM medicines ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const result = await pool.query(
      `SELECT id, name, price, quantity, category, description, requires_prescription, is_active, popularity, created_at, updated_at
       FROM medicines 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );
    
    res.json({ 
      medicines: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching medicines for admin:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});

/**
 * GET /api/medicines/admin/categories
 * Get all categories for admin (includes inactive)
 * Requires admin authentication
 */
router.get('/admin/categories', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, icon, sort_order, is_active, created_at
       FROM medicine_categories 
       ORDER BY sort_order ASC`
    );
    
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Error fetching categories for admin:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/medicines
 * Add a new medicine
 * Requires admin authentication
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, price, quantity, category, description, requires_prescription } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (price === undefined || price < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO medicines (name, price, quantity, category, description, requires_prescription, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, true) 
       RETURNING *`,
      [
        name.trim(),
        Number(price),
        quantity || '1',
        category || null,
        description || null,
        requires_prescription || false
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating medicine:', error);
    res.status(500).json({ error: 'Failed to create medicine' });
  }
});

/**
 * POST /api/medicines/bulk
 * Import medicines in bulk
 * Requires admin authentication
 */
router.post('/bulk', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { medicines } = req.body;
    
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'Medicines array is required' });
    }
    
    let imported = 0;
    let skipped = 0;
    
    for (const med of medicines) {
      if (!med.name || med.name.trim() === '') {
        skipped++;
        continue;
      }
      
      try {
        await pool.query(
          `INSERT INTO medicines (name, price, quantity, category, requires_prescription, popularity, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, true)
           ON CONFLICT DO NOTHING`,
          [
            med.name.trim(),
            Number(med.price) || 0,
            med.quantity || '1',
            med.category || null,
            med.prescription_id ? true : false,
            med.popularity || 0
          ]
        );
        imported++;
      } catch (err) {
        skipped++;
      }
    }
    
    res.json({ 
      message: `Imported ${imported} medicines, skipped ${skipped}`,
      imported,
      skipped
    });
  } catch (error) {
    console.error('Error bulk importing medicines:', error);
    res.status(500).json({ error: 'Failed to import medicines' });
  }
});

/**
 * PUT /api/medicines/:id
 * Update a medicine
 * Requires admin authentication
 */
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, quantity, category, description, requires_prescription, is_active, popularity } = req.body;
    
    const result = await pool.query(
      `UPDATE medicines 
       SET name = COALESCE($1, name), 
           price = COALESCE($2, price),
           quantity = COALESCE($3, quantity),
           category = COALESCE($4, category),
           description = COALESCE($5, description),
           requires_prescription = COALESCE($6, requires_prescription),
           is_active = COALESCE($7, is_active),
           popularity = COALESCE($8, popularity),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, price, quantity, category, description, requires_prescription, is_active, popularity, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ error: 'Failed to update medicine' });
  }
});

/**
 * POST /api/medicines/:id/toggle
 * Toggle medicine active status
 * Requires admin authentication
 */
router.post('/:id/toggle', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE medicines 
       SET is_active = NOT is_active,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling medicine:', error);
    res.status(500).json({ error: 'Failed to toggle medicine' });
  }
});

/**
 * DELETE /api/medicines/:id
 * Delete a medicine
 * Requires admin authentication
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM medicines WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    res.json({ message: 'Medicine deleted', ...result.rows[0] });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
});

/**
 * POST /api/medicines/categories
 * Add a new category
 * Requires admin authentication
 */
router.post('/categories', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { slug, name, icon, sort_order } = req.body;
    
    if (!slug || !name) {
      return res.status(400).json({ error: 'Slug and name are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO medicine_categories (slug, name, icon, sort_order, is_active) 
       VALUES ($1, $2, $3, $4, true) 
       RETURNING *`,
      [slug.toLowerCase().replace(/\s+/g, '_'), name, icon || null, sort_order || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category with this slug already exists' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /api/medicines/categories/:id
 * Update a category
 * Requires admin authentication
 */
router.put('/categories/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, sort_order, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE medicine_categories 
       SET name = COALESCE($1, name), 
           icon = COALESCE($2, icon),
           sort_order = COALESCE($3, sort_order),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [name, icon, sort_order, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/medicines/categories/:id
 * Delete a category
 * Requires admin authentication
 */
router.delete('/categories/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM medicine_categories WHERE id = $1 RETURNING id, slug, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted', ...result.rows[0] });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * POST /api/medicines/:id/increment-popularity
 * Increment popularity when medicine is ordered (called from client)
 */
router.post('/:id/increment-popularity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE medicines SET popularity = popularity + 1 WHERE id = $1',
      [id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing popularity:', error);
    res.status(500).json({ error: 'Failed to update popularity' });
  }
});

export default router;
