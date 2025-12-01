-- Stays table - stores DIDs of users who are stay providers (hotels, accommodations)
-- Admin can mark users as stay providers, and their posts with 'stay' label will appear in the Stay section

CREATE TABLE IF NOT EXISTS stays (
    id SERIAL PRIMARY KEY,
    did VARCHAR(255) UNIQUE NOT NULL, -- AT Protocol DID of the stay provider
    name VARCHAR(255), -- Display name for admin reference
    description TEXT, -- Optional description
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by DID
CREATE INDEX IF NOT EXISTS idx_stays_did ON stays(did);
CREATE INDEX IF NOT EXISTS idx_stays_active ON stays(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stays_updated_at
    BEFORE UPDATE ON stays
    FOR EACH ROW
    EXECUTE FUNCTION update_stays_updated_at();
