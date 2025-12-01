import { Router, Request, Response } from 'express'
import pool from '../config/database'
import { authenticateAdmin } from './admin'

const router = Router()

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * GET /api/stay-posts/approved
 * Get all approved stay posts with their categories
 * Used by frontend to display posts in Stay screen
 */
router.get('/approved', async (req: Request, res: Response) => {
    try {
        const { propertyType, experience, amenities, priceRange, curatedCategory } = req.query

        let query = `
            SELECT 
                sp.id,
                sp.post_uri,
                sp.post_cid,
                sp.author_did,
                sp.author_handle,
                sp.categories,
                sp.amenities,
                sp.property_type,
                sp.price_range,
                sp.guest_type,
                sp.price_per_night,
                sp.currency,
                sp.location_text,
                sp.latitude,
                sp.longitude,
                sp.curated_categories,
                sp.submitted_at,
                sp.approved_at AS reviewed_at,
                s.name AS provider_name
            FROM stay_posts sp
            LEFT JOIN stays s ON sp.author_did = s.did
            WHERE sp.approval_status = 'approved'
        `

        const params: any[] = []
        let paramIndex = 1

        // Filter by property type
        if (propertyType) {
            query += ` AND sp.property_type = $${paramIndex}`
            params.push(propertyType)
            paramIndex++
        }

        // Filter by price range
        if (priceRange) {
            query += ` AND sp.price_range = $${paramIndex}`
            params.push(priceRange)
            paramIndex++
        }

        // Filter by curated category
        if (curatedCategory) {
            query += ` AND sp.curated_categories @> $${paramIndex}::jsonb`
            params.push(JSON.stringify([curatedCategory]))
            paramIndex++
        }

        // Filter by experience type (nested in categories JSONB)
        if (experience) {
            query += ` AND sp.categories->>'experience' = $${paramIndex}`
            params.push(experience)
            paramIndex++
        }

        // Filter by amenities (array contains)
        if (amenities) {
            const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities]
            query += ` AND sp.amenities ?& $${paramIndex}::text[]`
            params.push(amenitiesArray)
            paramIndex++
        }

        query += ' ORDER BY sp.submitted_at DESC'

        const result = await pool.query(query, params)

        res.json({
            success: true,
            posts: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error('Error fetching approved stay posts:', error)
        res.status(500).json({ error: 'Failed to fetch approved stay posts' })
    }
})

/**
 * GET /api/stay-posts/curated-categories
 * Get all active curated categories (Kitesurfer Package, Family Vacation, etc.)
 * Used by frontend to display smart filter combinations
 */
router.get('/curated-categories', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT 
                category_id,
                name,
                description,
                icon,
                filter_criteria,
                display_order
            FROM curated_stay_categories
            WHERE is_active = true
            ORDER BY display_order ASC`,
        )

        res.json({
            success: true,
            categories: result.rows,
        })
    } catch (error) {
        console.error('Error fetching curated categories:', error)
        res.status(500).json({ error: 'Failed to fetch curated categories' })
    }
})

// ============================================================================
// ADMIN-ONLY ENDPOINTS (Protected by authenticateAdmin middleware)
// ============================================================================

/**
 * GET /api/stay-posts/pending
 * Get all pending stay posts for admin review
 */
router.get('/pending', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT 
                sp.id,
                sp.post_uri,
                sp.post_cid,
                sp.author_did,
                sp.author_handle,
                sp.categories,
                sp.amenities,
                sp.property_type,
                sp.price_range,
                sp.guest_type,
                sp.price_per_night,
                sp.currency,
                sp.location_text,
                sp.latitude,
                sp.longitude,
                sp.submitted_at,
                s.name AS provider_name,
                s.is_active AS provider_is_active
            FROM stay_posts sp
            LEFT JOIN stays s ON sp.author_did = s.did
            WHERE sp.approval_status = 'pending'
            ORDER BY sp.submitted_at DESC`,
        )

        res.json({
            success: true,
            posts: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error('Error fetching pending stay posts:', error)
        res.status(500).json({ error: 'Failed to fetch pending stay posts' })
    }
})

/**
 * GET /api/stay-posts/all
 * Get all stay posts (pending, approved, rejected) for admin dashboard
 */
router.get('/all', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { status } = req.query

        let query = `
            SELECT 
                sp.id,
                sp.post_uri,
                sp.post_cid,
                sp.author_did,
                sp.author_handle,
                sp.categories,
                sp.amenities,
                sp.property_type,
                sp.price_range,
                sp.approval_status,
                sp.submitted_at,
                sp.reviewed_at,
                sp.rejection_reason,
                sp.curated_categories,
                s.name AS provider_name,
                au.name AS reviewed_by_name
            FROM stay_posts sp
            LEFT JOIN stays s ON sp.author_did = s.did
            LEFT JOIN admin_users au ON sp.reviewed_by = au.id
        `

        const params: any[] = []
        if (status) {
            query += ' WHERE sp.approval_status = $1'
            params.push(status)
        }

        query += ' ORDER BY sp.submitted_at DESC'

        const result = await pool.query(query, params)

        res.json({
            success: true,
            posts: result.rows,
            count: result.rows.length,
        })
    } catch (error) {
        console.error('Error fetching all stay posts:', error)
        res.status(500).json({ error: 'Failed to fetch stay posts' })
    }
})

/**
 * POST /api/stay-posts/submit
 * Frontend webhook: Called when user creates a stay post
 * Registers the post for admin approval
 */
router.post('/submit', async (req: Request, res: Response) => {
    try {
        const {
            postUri,
            postCid,
            authorDid,
            authorHandle,
            categories,
            amenities,
            propertyType,
            priceRange,
            guestType,
            pricePerNight,
            currency,
            locationText,
            latitude,
            longitude,
        } = req.body

        // Validate required fields
        if (!postUri || !postCid || !authorDid) {
            return res.status(400).json({
                error: 'Missing required fields: postUri, postCid, authorDid',
            })
        }

        // Verify author is an approved stay provider
        const providerCheck = await pool.query(
            'SELECT did, is_active FROM stays WHERE did = $1',
            [authorDid],
        )

        if (providerCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Author is not an approved stay provider',
            })
        }

        if (!providerCheck.rows[0].is_active) {
            return res.status(403).json({
                error: 'Stay provider account is not active',
            })
        }

        // Insert stay post for approval
        const result = await pool.query(
            `INSERT INTO stay_posts (
                post_uri,
                post_cid,
                author_did,
                author_handle,
                categories,
                amenities,
                property_type,
                price_range,
                guest_type,
                price_per_night,
                currency,
                location_text,
                latitude,
                longitude,
                approval_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
            RETURNING id, post_uri, approval_status`,
            [
                postUri,
                postCid,
                authorDid,
                authorHandle,
                JSON.stringify(categories || {}),
                JSON.stringify(amenities || []),
                propertyType,
                priceRange,
                guestType,
                pricePerNight,
                currency || 'MAD',
                locationText,
                latitude,
                longitude,
            ],
        )

        // Log activity
        await pool.query(
            `INSERT INTO stay_posts_activity_log (stay_post_id, action, details)
            VALUES ($1, 'submitted', $2)`,
            [result.rows[0].id, JSON.stringify({ postUri, authorHandle })],
        )

        res.status(201).json({
            success: true,
            message: 'Stay post submitted for approval',
            stayPost: result.rows[0],
        })
    } catch (error: any) {
        console.error('Error submitting stay post:', error)

        // Handle duplicate post_uri
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'This post has already been submitted',
            })
        }

        res.status(500).json({ error: 'Failed to submit stay post' })
    }
})

/**
 * POST /api/stay-posts/approve/:id
 * Approve a pending stay post
 */
router.post('/approve/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { curatedCategories } = req.body
        const adminId = (req as any).admin.id

        // Update post status
        const result = await pool.query(
            `UPDATE stay_posts 
            SET 
                approval_status = 'approved',
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = $1,
                curated_categories = $2
            WHERE id = $3 AND approval_status = 'pending'
            RETURNING id, post_uri, author_did, author_handle`,
            [adminId, JSON.stringify(curatedCategories || []), id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Stay post not found or already reviewed',
            })
        }

        // Log activity
        await pool.query(
            `INSERT INTO stay_posts_activity_log (stay_post_id, admin_id, action, details)
            VALUES ($1, $2, 'approved', $3)`,
            [id, adminId, JSON.stringify({ curatedCategories })],
        )

        res.json({
            success: true,
            message: 'Stay post approved',
            stayPost: result.rows[0],
        })
    } catch (error) {
        console.error('Error approving stay post:', error)
        res.status(500).json({ error: 'Failed to approve stay post' })
    }
})

/**
 * POST /api/stay-posts/reject/:id
 * Reject a pending stay post
 */
router.post('/reject/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { reason } = req.body
        const adminId = (req as any).admin.id

        // Update post status
        const result = await pool.query(
            `UPDATE stay_posts 
            SET 
                approval_status = 'rejected',
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = $1,
                rejection_reason = $2
            WHERE id = $3 AND approval_status = 'pending'
            RETURNING id, post_uri, author_did, author_handle`,
            [adminId, reason, id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Stay post not found or already reviewed',
            })
        }

        // Log activity
        await pool.query(
            `INSERT INTO stay_posts_activity_log (stay_post_id, admin_id, action, details)
            VALUES ($1, $2, 'rejected', $3)`,
            [id, adminId, JSON.stringify({ reason })],
        )

        res.json({
            success: true,
            message: 'Stay post rejected',
            stayPost: result.rows[0],
        })
    } catch (error) {
        console.error('Error rejecting stay post:', error)
        res.status(500).json({ error: 'Failed to reject stay post' })
    }
})

/**
 * PUT /api/stay-posts/:id/curated
 * Update curated categories for a stay post
 */
router.put('/:id/curated', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { curatedCategories } = req.body
        const adminId = (req as any).admin.id

        const result = await pool.query(
            `UPDATE stay_posts 
            SET curated_categories = $1
            WHERE id = $2
            RETURNING id, post_uri, curated_categories`,
            [JSON.stringify(curatedCategories || []), id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stay post not found' })
        }

        // Log activity
        await pool.query(
            `INSERT INTO stay_posts_activity_log (stay_post_id, admin_id, action, details)
            VALUES ($1, $2, 'curated_updated', $3)`,
            [id, adminId, JSON.stringify({ curatedCategories })],
        )

        res.json({
            success: true,
            stayPost: result.rows[0],
        })
    } catch (error) {
        console.error('Error updating curated categories:', error)
        res.status(500).json({ error: 'Failed to update curated categories' })
    }
})

/**
 * GET /api/stay-posts/:id
 * Get a specific stay post by ID
 */
router.get('/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const result = await pool.query(
            `SELECT 
                sp.*,
                s.name AS provider_name,
                au.name AS reviewed_by_name
            FROM stay_posts sp
            LEFT JOIN stays s ON sp.author_did = s.did
            LEFT JOIN admin_users au ON sp.reviewed_by = au.id
            WHERE sp.id = $1`,
            [id],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stay post not found' })
        }

        res.json({
            success: true,
            post: result.rows[0],
        })
    } catch (error) {
        console.error('Error fetching stay post:', error)
        res.status(500).json({ error: 'Failed to fetch stay post' })
    }
})

/**
 * DELETE /api/stay-posts/:id
 * Delete a stay post (admin only)
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const adminId = (req as any).admin.id

        const result = await pool.query('DELETE FROM stay_posts WHERE id = $1 RETURNING id', [id])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stay post not found' })
        }

        res.json({
            success: true,
            message: 'Stay post deleted',
        })
    } catch (error) {
        console.error('Error deleting stay post:', error)
        res.status(500).json({ error: 'Failed to delete stay post' })
    }
})

export default router
