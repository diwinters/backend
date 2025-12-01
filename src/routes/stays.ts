import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateAdmin } from './admin';
import { getUserProfileByDID, isValidDID } from '../services/plc-directory.service';

const router = Router();

interface Stay {
  id: number;
  did: string;
  name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/stays
 * Get all stays (public endpoint for client to filter posts)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, did, name, description, is_active, created_at, updated_at 
       FROM stays 
       WHERE is_active = true 
       ORDER BY created_at DESC`
    );
    
    res.json({ 
      stays: result.rows,
      dids: result.rows.map((s: Stay) => s.did) // Convenience array of just DIDs for filtering
    });
  } catch (error) {
    console.error('Error fetching stays:', error);
    res.status(500).json({ error: 'Failed to fetch stays' });
  }
});

/**
 * GET /api/stays/admin
 * Get all stays for admin (includes inactive)
 * Requires admin authentication
 */
router.get('/admin', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, did, name, description, is_active, created_at, updated_at 
       FROM stays 
       ORDER BY created_at DESC`
    );
    
    res.json({ stays: result.rows });
  } catch (error) {
    console.error('Error fetching stays for admin:', error);
    res.status(500).json({ error: 'Failed to fetch stays' });
  }
});

/**
 * POST /api/stays
 * Add a new stay provider
 * Requires admin authentication
 */
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { did, name, description } = req.body;
    
    if (!did) {
      return res.status(400).json({ error: 'DID is required' });
    }
    
    // Validate DID format
    if (!isValidDID(did)) {
      return res.status(400).json({ error: 'Invalid DID format' });
    }
    
    // Check if already exists
    const existingResult = await pool.query(
      'SELECT id FROM stays WHERE did = $1',
      [did]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Stay provider with this DID already exists' });
    }
    
    // Try to fetch profile info if name not provided
    let stayName = name;
    if (!stayName) {
      try {
        const profile = await getUserProfileByDID(did);
        stayName = profile?.handle || did;
      } catch {
        stayName = did;
      }
    }
    
    // Insert the new stay
    const result = await pool.query(
      `INSERT INTO stays (did, name, description) 
       VALUES ($1, $2, $3) 
       RETURNING id, did, name, description, is_active, created_at, updated_at`,
      [did, stayName, description || null]
    );
    
    res.status(201).json({ stay: result.rows[0] });
  } catch (error) {
    console.error('Error adding stay:', error);
    res.status(500).json({ error: 'Failed to add stay provider' });
  }
});

/**
 * PUT /api/stays/:id
 * Update a stay provider
 * Requires admin authentication
 */
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE stays 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING id, did, name, description, is_active, created_at, updated_at`,
      [name, description, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stay provider not found' });
    }
    
    res.json({ stay: result.rows[0] });
  } catch (error) {
    console.error('Error updating stay:', error);
    res.status(500).json({ error: 'Failed to update stay provider' });
  }
});

/**
 * DELETE /api/stays/:id
 * Delete a stay provider
 * Requires admin authentication
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM stays WHERE id = $1 RETURNING id, did',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stay provider not found' });
    }
    
    res.json({ message: 'Stay provider deleted', stay: result.rows[0] });
  } catch (error) {
    console.error('Error deleting stay:', error);
    res.status(500).json({ error: 'Failed to delete stay provider' });
  }
});

/**
 * POST /api/stays/:id/toggle
 * Toggle a stay provider's active status
 * Requires admin authentication
 */
router.post('/:id/toggle', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE stays 
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, did, name, description, is_active, created_at, updated_at`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stay provider not found' });
    }
    
    res.json({ stay: result.rows[0] });
  } catch (error) {
    console.error('Error toggling stay:', error);
    res.status(500).json({ error: 'Failed to toggle stay provider' });
  }
});

export default router;
