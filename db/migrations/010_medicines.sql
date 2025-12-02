-- Medicines table - stores medicine inventory for pharmacy feature
-- Admin can manage medicines (add, edit, delete, toggle active status)

-- Enable pg_trgm extension for fuzzy text search (requires superuser or extension already installed)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantity VARCHAR(50) DEFAULT '1', -- Package quantity (e.g., "30 tablets", "100ml")
    category VARCHAR(100), -- Category for filtering (e.g., "pain_relief", "antibiotics", "vitamins")
    description TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    popularity INTEGER DEFAULT 0, -- For sorting by popularity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON medicines(is_active);
CREATE INDEX IF NOT EXISTS idx_medicines_popularity ON medicines(popularity DESC);

-- Full text search index for medicine name
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_medicines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medicines_updated_at
    BEFORE UPDATE ON medicines
    FOR EACH ROW
    EXECUTE FUNCTION update_medicines_updated_at();

-- Categories table for organizing medicines
CREATE TABLE IF NOT EXISTS medicine_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50), -- Icon name for display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories (matching therapeutic classes)
INSERT INTO medicine_categories (slug, name, icon, sort_order) VALUES
    ('pain_relief', 'Pain Relief & Anti-inflammatory', 'pill', 1),
    ('antibiotics', 'Antibiotics & Anti-Infectives', 'shield', 2),
    ('vitamins', 'Vitamins & Supplements', 'heart', 3),
    ('cold_flu', 'Cold, Flu & Respiratory', 'thermometer', 4),
    ('digestive', 'Digestive & Gastrointestinal', 'activity', 5),
    ('skin_care', 'Skin Care & Dermatology', 'sparkles', 6),
    ('eye_care', 'Eye Care & Ophthalmology', 'eye', 7),
    ('diabetes', 'Diabetes & Endocrine', 'droplet', 8),
    ('heart', 'Heart & Cardiovascular', 'heart-pulse', 9),
    ('allergy', 'Allergy', 'flower', 10),
    ('other', 'Other', 'box', 99)
ON CONFLICT (slug) DO NOTHING;
