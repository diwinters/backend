-- Feeds table - stores custom feeds for the FeedsHome screen tabs
CREATE TABLE feeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                    -- Display name (e.g., "Following", "Discover")
    name_ar VARCHAR(255),                          -- Arabic name
    feed_uri VARCHAR(500),                         -- AT Protocol feed URI (e.g., at://did:plc:.../app.bsky.feed.generator/...)
    feed_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'following', 'timeline', 'feedgen', 'list', 'custom'
    description TEXT,
    description_ar TEXT,
    icon VARCHAR(100) DEFAULT 'hashtag',           -- Icon name
    color VARCHAR(20) DEFAULT '#3B82F6',           -- Tab color
    sort_order INTEGER DEFAULT 0,                  -- Order in tab bar
    is_pinned BOOLEAN DEFAULT true,                -- Show in tab bar
    is_default BOOLEAN DEFAULT false,              -- Default selected tab
    is_active BOOLEAN DEFAULT true,
    city_id INTEGER,                               -- Optional city-specific feed (FK added if cities table exists)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER                             -- Admin who created (FK added if admin_users table exists)
);

-- Create index for faster queries
CREATE INDEX idx_feeds_sort_order ON feeds(sort_order);
CREATE INDEX idx_feeds_is_active ON feeds(is_active);
CREATE INDEX idx_feeds_city_id ON feeds(city_id);

-- Add foreign keys only if referenced tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
        ALTER TABLE feeds ADD CONSTRAINT fk_feeds_city FOREIGN KEY (city_id) REFERENCES cities(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        ALTER TABLE feeds ADD CONSTRAINT fk_feeds_admin FOREIGN KEY (created_by) REFERENCES admin_users(id);
    END IF;
END $$;

-- Insert default feeds
INSERT INTO feeds (name, name_ar, feed_type, description, icon, sort_order, is_pinned, is_default) VALUES
('Following', 'المتابعون', 'following', 'Posts from accounts you follow', 'users', 0, true, true),
('Discover', 'اكتشف', 'feedgen', 'Trending and popular content', 'sparkle', 1, true, false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feeds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER feeds_updated_at_trigger
    BEFORE UPDATE ON feeds
    FOR EACH ROW
    EXECUTE FUNCTION update_feeds_updated_at();
