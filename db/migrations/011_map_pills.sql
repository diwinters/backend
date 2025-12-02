-- Map Pills - Admin-managed location markers and zones for the explore map
-- Pills are category buttons that group multiple places/zones

-- Map Pills table - the category buttons (e.g., "Beaches", "Hotels", "City Center")
CREATE TABLE IF NOT EXISTS map_pills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100), -- Arabic name
    icon VARCHAR(50) DEFAULT 'map-pin', -- Lucide icon name
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for the pill
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map Places table - individual locations or zones within a pill
CREATE TABLE IF NOT EXISTS map_places (
    id SERIAL PRIMARY KEY,
    pill_id INTEGER NOT NULL REFERENCES map_pills(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255), -- Arabic name
    description TEXT,
    
    -- For single point locations
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- For zones/polygons (stored as GeoJSON)
    -- Format: {"type": "Polygon", "coordinates": [[[lng, lat], [lng, lat], ...]]}
    zone_geojson JSONB,
    
    -- Zone styling
    zone_fill_color VARCHAR(9) DEFAULT '#3B82F680', -- Hex with alpha
    zone_stroke_color VARCHAR(7) DEFAULT '#3B82F6',
    zone_stroke_width DECIMAL(3, 1) DEFAULT 2,
    
    -- Marker styling for points
    marker_icon VARCHAR(50) DEFAULT 'map-pin',
    marker_color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Place type: 'point' or 'zone'
    place_type VARCHAR(10) DEFAULT 'point' CHECK (place_type IN ('point', 'zone')),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either point or zone is set based on type
    CONSTRAINT valid_point CHECK (
        place_type != 'point' OR (latitude IS NOT NULL AND longitude IS NOT NULL)
    ),
    CONSTRAINT valid_zone CHECK (
        place_type != 'zone' OR zone_geojson IS NOT NULL
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_map_pills_active ON map_pills(is_active);
CREATE INDEX IF NOT EXISTS idx_map_pills_sort ON map_pills(sort_order);
CREATE INDEX IF NOT EXISTS idx_map_places_pill ON map_places(pill_id);
CREATE INDEX IF NOT EXISTS idx_map_places_active ON map_places(is_active);
CREATE INDEX IF NOT EXISTS idx_map_places_type ON map_places(place_type);

-- Trigger to update updated_at timestamp for pills
CREATE OR REPLACE FUNCTION update_map_pills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER map_pills_updated_at
    BEFORE UPDATE ON map_pills
    FOR EACH ROW
    EXECUTE FUNCTION update_map_pills_updated_at();

-- Trigger to update updated_at timestamp for places
CREATE OR REPLACE FUNCTION update_map_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER map_places_updated_at
    BEFORE UPDATE ON map_places
    FOR EACH ROW
    EXECUTE FUNCTION update_map_places_updated_at();

-- Insert some default pills as examples
INSERT INTO map_pills (name, name_ar, icon, color, sort_order) VALUES
    ('Beaches', 'الشواطئ', 'waves', '#0EA5E9', 1),
    ('Hotels', 'الفنادق', 'hotel', '#8B5CF6', 2),
    ('City Center', 'وسط المدينة', 'building-2', '#F59E0B', 3),
    ('Restaurants', 'المطاعم', 'utensils', '#EF4444', 4),
    ('Activities', 'الأنشطة', 'compass', '#10B981', 5)
ON CONFLICT DO NOTHING;
