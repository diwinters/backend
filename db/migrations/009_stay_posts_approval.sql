-- Migration: Stay Posts Approval System
-- Description: Adds stay_posts table for admin approval workflow and smart category filters
-- Created: 2025-12-01

-- Create stay_posts table for tracking stay posts that need approval
CREATE TABLE IF NOT EXISTS stay_posts (
    id SERIAL PRIMARY KEY,
    
    -- Post identification (AT Protocol URIs)
    post_uri VARCHAR(500) UNIQUE NOT NULL,  -- at://did:plc:xxx/app.bsky.feed.post/3abc123
    post_cid VARCHAR(255) NOT NULL,         -- Content ID for post verification
    
    -- Author information
    author_did VARCHAR(255) NOT NULL,       -- AT Protocol DID of post author
    author_handle VARCHAR(255),             -- Username for display
    
    -- Category data (nested JSON structure for flexible filtering)
    categories JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure: {
    --   "propertyType": "villa",
    --   "experience": "beachfront",
    --   "amenities": ["pool", "wifi", "kitchen"],
    --   "priceRange": "luxury",
    --   "guestType": "family",
    --   "dakhlaSpecific": {
    --     "kitesurf": true,
    --     "windExposure": "wind_protected",
    --     "lagoonAccess": "direct_lagoon"
    --   }
    -- }
    
    -- Additional metadata
    amenities JSONB DEFAULT '[]'::jsonb,    -- Array of amenity IDs
    property_type VARCHAR(50),              -- villa, apartment, riad, hotel, camp, houseboat
    price_range VARCHAR(20),                -- budget, midrange, luxury
    guest_type VARCHAR(50),                 -- solo, couple, family, group, business
    
    -- Pricing info
    price_per_night DECIMAL(10,2),          -- Nightly rate
    currency VARCHAR(3) DEFAULT 'MAD',      -- Currency code (MAD = Moroccan Dirham)
    
    -- Location data
    location_text TEXT,                     -- User-provided location description
    latitude DOUBLE PRECISION,              -- For map display
    longitude DOUBLE PRECISION,
    
    -- Approval workflow
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES admin_users(id),  -- Admin who approved/rejected
    rejection_reason TEXT,                   -- Optional reason for rejection
    
    -- Admin curation (smart filter combinations)
    curated_categories JSONB DEFAULT '[]'::jsonb,  
    -- Array of curated category IDs this post belongs to
    -- e.g., ["kitesurfer_package", "family_vacation", "romantic_getaway"]
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint (verify author is approved stay provider)
    CONSTRAINT fk_author_stay_provider 
        FOREIGN KEY (author_did) 
        REFERENCES stays(did) 
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_stay_posts_approval_status ON stay_posts(approval_status);
CREATE INDEX idx_stay_posts_author_did ON stay_posts(author_did);
CREATE INDEX idx_stay_posts_post_uri ON stay_posts(post_uri);
CREATE INDEX idx_stay_posts_submitted_at ON stay_posts(submitted_at DESC);

-- GIN index for JSONB category filtering
CREATE INDEX idx_stay_posts_categories ON stay_posts USING GIN (categories);
CREATE INDEX idx_stay_posts_amenities ON stay_posts USING GIN (amenities);
CREATE INDEX idx_stay_posts_curated ON stay_posts USING GIN (curated_categories);

-- Composite index for approved posts queries (most common query)
CREATE INDEX idx_stay_posts_approved_submitted 
    ON stay_posts(approval_status, submitted_at DESC) 
    WHERE approval_status = 'approved';

-- Index for property type filtering
CREATE INDEX idx_stay_posts_property_type ON stay_posts(property_type) 
    WHERE approval_status = 'approved';

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_stay_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stay_posts_updated_at
    BEFORE UPDATE ON stay_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_stay_posts_updated_at();

-- Create curated_categories lookup table (admin-defined smart filters)
CREATE TABLE IF NOT EXISTS curated_stay_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(50) UNIQUE NOT NULL,  -- kitesurfer_package, family_vacation, etc.
    name VARCHAR(100) NOT NULL,               -- Display name
    description TEXT,                          -- Description for admins
    icon VARCHAR(10),                          -- Emoji icon
    
    -- Filter criteria (JSONB for flexible matching)
    filter_criteria JSONB NOT NULL,
    -- Structure: {
    --   "propertyType": ["villa", "apartment"],
    --   "amenities": ["pool", "wifi"],
    --   "priceRange": ["midrange", "luxury"],
    --   "dakhlaSpecific.kitesurf": true
    -- }
    
    -- Display settings
    display_order INTEGER DEFAULT 0,           -- Sort order in UI
    is_active BOOLEAN DEFAULT true,            -- Enable/disable without deleting
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for active categories
CREATE INDEX idx_curated_categories_active_order 
    ON curated_stay_categories(is_active, display_order) 
    WHERE is_active = true;

-- Auto-update timestamp trigger for curated categories
CREATE TRIGGER curated_categories_updated_at
    BEFORE UPDATE ON curated_stay_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_stay_posts_updated_at();

-- Insert default curated categories (from user's spec)
INSERT INTO curated_stay_categories (category_id, name, description, icon, filter_criteria, display_order) VALUES
('kitesurfer_package', 'Kitesurfer Package', 'Perfect for kite enthusiasts with gear storage and lagoon access', '🪁', 
 '{"amenities": ["wifi", "gear_storage"], "propertyType": ["apartment", "villa"], "priceRange": ["midrange"], "dakhlaSpecific": {"kitesurf": true, "windExposure": "wind_exposed"}}', 1),

('family_vacation', 'Family Vacation', 'Family-friendly accommodations with pool and kitchen', '👨‍👩‍👧‍👦', 
 '{"guestType": ["family"], "amenities": ["pool", "kitchen", "wifi"], "propertyType": ["villa", "apartment"], "priceRange": ["midrange", "luxury"]}', 2),

('digital_nomad', 'Digital Nomad', 'Work-friendly spaces with high-speed WiFi and workspace', '💻', 
 '{"amenities": ["wifi", "workspace", "kitchen"], "guestType": ["solo", "couple"], "priceRange": ["budget", "midrange"]}', 3),

('romantic_getaway', 'Romantic Getaway', 'Intimate beachfront or lagoon view properties for couples', '💖', 
 '{"guestType": ["couple"], "experience": ["beachfront", "lagoon"], "amenities": ["pool", "breakfast"], "propertyType": ["villa", "riad"]}', 4),

('adventure_seeker', 'Adventure Seeker', 'Unique desert camps and houseboats for adventurous travelers', '🧗‍♂️', 
 '{"propertyType": ["camp", "houseboat"], "experience": ["desert", "lagoon"], "priceRange": ["budget", "midrange"]}', 5),

('beachfront_luxury', 'Beachfront Luxury', 'Premium beachfront properties with ocean views', '🏖️', 
 '{"experience": ["beachfront"], "priceRange": ["luxury"], "amenities": ["pool", "ac", "wifi"]}', 6),

('budget_friendly', 'Budget Friendly', 'Affordable stays without compromising on essentials', '💰', 
 '{"priceRange": ["budget"], "amenities": ["wifi"]}', 7),

('desert_experience', 'Desert Experience', 'Authentic desert camps with stargazing and safari access', '🏜️', 
 '{"experience": ["desert"], "propertyType": ["camp"]}', 8);

-- Activity log table for stay post approval actions
CREATE TABLE IF NOT EXISTS stay_posts_activity_log (
    id SERIAL PRIMARY KEY,
    stay_post_id INTEGER REFERENCES stay_posts(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(50) NOT NULL,  -- submitted, approved, rejected, curated_added, curated_removed
    details JSONB,                 -- Additional context (rejection reason, curated category added, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stay_posts_activity_stay_post ON stay_posts_activity_log(stay_post_id);
CREATE INDEX idx_stay_posts_activity_admin ON stay_posts_activity_log(admin_id);
CREATE INDEX idx_stay_posts_activity_created ON stay_posts_activity_log(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE stay_posts IS 'Stores stay accommodation posts for admin approval workflow';
COMMENT ON COLUMN stay_posts.categories IS 'Nested JSON structure with propertyType, experience, amenities, priceRange, guestType, dakhlaSpecific';
COMMENT ON COLUMN stay_posts.curated_categories IS 'Array of curated category IDs this post belongs to (e.g., ["kitesurfer_package"])';
COMMENT ON TABLE curated_stay_categories IS 'Admin-defined smart filter combinations (Kitesurfer Package, Family Vacation, etc.)';
