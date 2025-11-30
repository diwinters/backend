-- Create pricing_configurations table
CREATE TABLE pricing_configurations (
    id SERIAL PRIMARY KEY,
    city_slug VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'dakhla', 'casablanca'
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'DH',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Casablanca',
    is_active BOOLEAN DEFAULT true,
    
    -- Configuration stored as JSONB for flexibility
    config JSONB NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES admin_users(id)
);

-- Create index for fast lookups
CREATE INDEX idx_pricing_city ON pricing_configurations(city_slug);

-- Insert default Dakhla configuration (migrating from code)
INSERT INTO pricing_configurations (city_slug, name, currency, timezone, config)
VALUES (
    'dakhla', 
    'Dakhla', 
    'DH', 
    'Africa/Casablanca',
    '{
        "nightStartHour": 20,
        "nightEndHour": 6,
        "ride": {
            "baseFareDay": 4,
            "baseFareNight": 5,
            "baseDistanceKm": 5,
            "perKmAfterBase": 0.4,
            "perKmInterval": 2,
            "minimumFare": 4,
            "specialZones": [
                {
                    "name": "Airport",
                    "coordinates": { "lat": 23.718, "lng": -15.932 },
                    "radiusKm": 2,
                    "fixedFare": 20
                },
                {
                    "name": "Port",
                    "coordinates": { "lat": 23.680, "lng": -15.940 },
                    "radiusKm": 1.5,
                    "fixedFare": 15
                },
                {
                    "name": "PK25",
                    "coordinates": { "lat": 23.920, "lng": -15.850 },
                    "radiusKm": 3,
                    "fixedFare": 50
                }
            ]
        },
        "delivery": {
            "baseFare": 10,
            "perKm": 2,
            "packageMultiplier": {
                "small": 1,
                "medium": 1.2,
                "large": 1.5,
                "extra_large": 2
            },
            "minimumFare": 10
        },
        "platformFeePercent": 10,
        "surge": {
            "enabled": false,
            "maxMultiplier": 2.0
        }
    }'::jsonb
);

-- Add trigger to update updated_at
CREATE TRIGGER update_pricing_timestamp
    BEFORE UPDATE ON pricing_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
