-- =============================================================================
-- CITIES: The Central Entity for Multi-City Operations
-- =============================================================================
-- Cities are the foundation of the platform. All modules (rides, stays, commerce,
-- content) are scoped to cities. Each city has:
-- - Geographic boundary (polygon)
-- - Enabled modules
-- - Custom settings and pricing
-- =============================================================================

-- Main cities table
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,              -- URL-friendly: 'dakhla', 'casablanca'
    name VARCHAR(100) NOT NULL,                     -- Display name: 'Dakhla'
    name_ar VARCHAR(100),                           -- Arabic: 'الداخلة'
    country_code VARCHAR(2) DEFAULT 'MA',
    timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
    currency VARCHAR(10) DEFAULT 'DH',
    
    -- Geographic center and zoom for map
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    default_zoom INTEGER DEFAULT 13,
    
    -- City boundary as GeoJSON Polygon
    -- Format: {"type": "Polygon", "coordinates": [[[lng, lat], [lng, lat], ...]]}
    boundary JSONB,
    
    -- Module enablement - which features are active in this city
    modules JSONB DEFAULT '{
        "rides": {"enabled": true, "settings": {}},
        "stays": {"enabled": true, "settings": {}},
        "shop": {"enabled": false, "settings": {}},
        "pharmacy": {"enabled": false, "settings": {}},
        "content": {"enabled": true, "settings": {}}
    }'::jsonb,
    
    -- City-specific settings (operating hours, contact info, etc.)
    settings JSONB DEFAULT '{
        "operatingHours": {"start": "06:00", "end": "23:00"},
        "supportPhone": null,
        "supportEmail": null,
        "minAppVersion": null
    }'::jsonb,
    
    -- City branding
    cover_image_url TEXT,
    icon_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,              -- Fallback city when location unknown
    is_coming_soon BOOLEAN DEFAULT false,          -- Show in app but not operational
    launch_date DATE,
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for cities
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active);
CREATE INDEX IF NOT EXISTS idx_cities_default ON cities(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities(center_lat, center_lng);

-- =============================================================================
-- Add city_id to existing tables
-- =============================================================================

-- Add city_id to pricing_configurations
ALTER TABLE pricing_configurations 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL;

-- Add city_id to map_pills
ALTER TABLE map_pills 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE;

-- Add city_id to stays
ALTER TABLE stays 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL;

-- Add city_id to medicines (pharmacy is city-specific)
ALTER TABLE medicines 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL;

-- Create indexes for city_id foreign keys
CREATE INDEX IF NOT EXISTS idx_pricing_city ON pricing_configurations(city_id);
CREATE INDEX IF NOT EXISTS idx_map_pills_city ON map_pills(city_id);
CREATE INDEX IF NOT EXISTS idx_stays_city ON stays(city_id);
CREATE INDEX IF NOT EXISTS idx_medicines_city ON medicines(city_id);

-- =============================================================================
-- City Admins - Which admins can manage which cities
-- =============================================================================

CREATE TABLE IF NOT EXISTS city_admins (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'manager' CHECK (role IN ('manager', 'viewer', 'super')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_id, admin_id)
);

CREATE INDEX IF NOT EXISTS idx_city_admins_city ON city_admins(city_id);
CREATE INDEX IF NOT EXISTS idx_city_admins_admin ON city_admins(admin_id);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update timestamp trigger for cities
CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cities_updated_at
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_cities_updated_at();

-- Ensure only one default city
CREATE OR REPLACE FUNCTION ensure_single_default_city()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE cities SET is_default = false WHERE id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_default_city
    BEFORE INSERT OR UPDATE ON cities
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_city();

-- =============================================================================
-- Insert default city (Dakhla)
-- =============================================================================

INSERT INTO cities (
    slug, 
    name, 
    name_ar, 
    country_code,
    timezone,
    currency,
    center_lat, 
    center_lng, 
    default_zoom,
    boundary,
    modules,
    is_active,
    is_default,
    sort_order
) VALUES (
    'dakhla',
    'Dakhla',
    'الداخلة',
    'MA',
    'Africa/Casablanca',
    'DH',
    23.7221,
    -15.9347,
    13,
    '{
        "type": "Polygon",
        "coordinates": [[
            [-16.05, 23.60],
            [-15.80, 23.60],
            [-15.80, 23.85],
            [-16.05, 23.85],
            [-16.05, 23.60]
        ]]
    }'::jsonb,
    '{
        "rides": {"enabled": true, "settings": {"allowScheduled": true, "allowDelivery": true}},
        "stays": {"enabled": true, "settings": {}},
        "shop": {"enabled": false, "settings": {}},
        "pharmacy": {"enabled": true, "settings": {}},
        "content": {"enabled": true, "settings": {}}
    }'::jsonb,
    true,
    true,
    1
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Link existing pricing to Dakhla
-- =============================================================================

UPDATE pricing_configurations 
SET city_id = (SELECT id FROM cities WHERE slug = 'dakhla')
WHERE city_slug = 'dakhla' AND city_id IS NULL;

-- =============================================================================
-- Function to detect city from coordinates
-- =============================================================================

CREATE OR REPLACE FUNCTION detect_city_from_point(
    lat DECIMAL,
    lng DECIMAL
) RETURNS INTEGER AS $$
DECLARE
    city_id INTEGER;
BEGIN
    -- Check if point is within any city boundary
    SELECT c.id INTO city_id
    FROM cities c
    WHERE c.is_active = true
      AND c.boundary IS NOT NULL
      AND ST_Contains(
          ST_SetSRID(ST_GeomFromGeoJSON(c.boundary::text), 4326),
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)
      )
    LIMIT 1;
    
    -- If no city found, return default city
    IF city_id IS NULL THEN
        SELECT c.id INTO city_id
        FROM cities c
        WHERE c.is_default = true AND c.is_active = true
        LIMIT 1;
    END IF;
    
    RETURN city_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- View for city statistics (dashboard overview)
-- =============================================================================

CREATE OR REPLACE VIEW city_stats AS
SELECT 
    c.id,
    c.slug,
    c.name,
    c.is_active,
    (SELECT COUNT(*) FROM driver_locations dl 
     JOIN users u ON dl.driver_did = u.did 
     WHERE dl.is_available = true) as online_drivers,
    (SELECT COUNT(*) FROM rides r 
     WHERE r.status IN ('pending', 'offered', 'accepted', 'in_progress')
     AND DATE(r.created_at) = CURRENT_DATE) as active_rides_today,
    (SELECT COUNT(*) FROM rides r 
     WHERE r.status = 'completed'
     AND DATE(r.completed_at) = CURRENT_DATE) as completed_rides_today,
    (SELECT COALESCE(SUM(r.final_price), 0) FROM rides r 
     WHERE r.status = 'completed'
     AND DATE(r.completed_at) = CURRENT_DATE) as revenue_today,
    (SELECT COUNT(*) FROM stays s WHERE s.city_id = c.id AND s.is_active = true) as active_stays,
    (SELECT COUNT(*) FROM map_pills mp WHERE mp.city_id = c.id AND mp.is_active = true) as map_pills_count
FROM cities c;

