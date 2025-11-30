-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table - stores user profiles with AT Protocol DIDs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    did VARCHAR(255) UNIQUE NOT NULL, -- AT Protocol DID (e.g., did:plc:...)
    display_name VARCHAR(255),
    avatar_url TEXT,
    user_type VARCHAR(20) CHECK (user_type IN ('rider', 'driver', 'both')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User devices table - stores device tokens for push notifications
CREATE TABLE user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(10) CHECK (platform IN ('ios', 'android')),
    app_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rides table - stores ride requests and status
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) UNIQUE,
    rider_did VARCHAR(255) NOT NULL REFERENCES users(did),
    driver_did VARCHAR(255) REFERENCES users(did),
    
    -- Pickup location
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_address TEXT,
    pickup_location GEOGRAPHY(POINT, 4326), -- PostGIS geography type
    
    -- Dropoff location
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    dropoff_address TEXT,
    dropoff_location GEOGRAPHY(POINT, 4326),
    
    -- Booking details
    booking_type VARCHAR(20) CHECK (booking_type IN ('standard', 'scheduled')),
    scheduled_time TIMESTAMP,
    
    -- Rider information
    rider_name VARCHAR(255),
    rider_phone VARCHAR(50),
    rider_notes TEXT,
    
    -- Delivery information (if applicable)
    delivery_recipient_name VARCHAR(255),
    delivery_recipient_phone VARCHAR(50),
    delivery_instructions TEXT,
    
    -- Ride status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'offered', 'accepted', 'driver_arrived', 
        'in_progress', 'completed', 'cancelled'
    )),
    
    -- Pricing
    estimated_price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Metadata
    cancellation_reason TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5)
);

-- Driver locations table - stores real-time driver GPS coordinates
CREATE TABLE driver_locations (
    id SERIAL PRIMARY KEY,
    driver_did VARCHAR(255) NOT NULL REFERENCES users(did),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326), -- PostGIS geography type for efficient spatial queries
    heading DOUBLE PRECISION, -- Direction in degrees (0-360)
    speed DOUBLE PRECISION, -- Speed in m/s
    is_available BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ride history table - stores historical ride data for analytics
CREATE TABLE ride_history (
    id SERIAL PRIMARY KEY,
    ride_id UUID REFERENCES rides(id),
    status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255), -- DID of user who made the change
    notes TEXT
);

-- Create indexes for performance

-- Users
CREATE INDEX idx_users_did ON users(did);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_active ON users(is_active);

-- User devices
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_token ON user_devices(device_token);
CREATE INDEX idx_user_devices_active ON user_devices(is_active);

-- Rides
CREATE INDEX idx_rides_rider_did ON rides(rider_did);
CREATE INDEX idx_rides_driver_did ON rides(driver_did);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created_at ON rides(created_at);
CREATE INDEX idx_rides_order_id ON rides(order_id);

-- Spatial indexes for geospatial queries (PostGIS)
CREATE INDEX idx_rides_pickup_location ON rides USING GIST(pickup_location);
CREATE INDEX idx_rides_dropoff_location ON rides USING GIST(dropoff_location);
CREATE INDEX idx_driver_locations_location ON driver_locations USING GIST(location);
CREATE INDEX idx_driver_locations_driver_did ON driver_locations(driver_did);
CREATE INDEX idx_driver_locations_available ON driver_locations(is_available);

-- Ride history
CREATE INDEX idx_ride_history_ride_id ON ride_history(ride_id);
CREATE INDEX idx_ride_history_changed_at ON ride_history(changed_at);

-- Create trigger to automatically update pickup_location and dropoff_location from lat/lng
CREATE OR REPLACE FUNCTION update_ride_locations()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pickup_location = ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
    NEW.dropoff_location = ST_SetSRID(ST_MakePoint(NEW.dropoff_lng, NEW.dropoff_lat), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ride_locations
BEFORE INSERT OR UPDATE ON rides
FOR EACH ROW
EXECUTE FUNCTION update_ride_locations();

-- Create trigger to automatically update driver location from lat/lng
CREATE OR REPLACE FUNCTION update_driver_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_location
BEFORE INSERT OR UPDATE ON driver_locations
FOR EACH ROW
EXECUTE FUNCTION update_driver_location();

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to find nearby available drivers
-- Returns drivers within specified radius (in meters) sorted by distance
CREATE OR REPLACE FUNCTION find_nearby_drivers(
    pickup_latitude DOUBLE PRECISION,
    pickup_longitude DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    driver_did VARCHAR,
    distance_meters DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dl.driver_did,
        ST_Distance(
            dl.location,
            ST_SetSRID(ST_MakePoint(pickup_longitude, pickup_latitude), 4326)::geography
        ) AS distance_meters,
        dl.latitude,
        dl.longitude,
        dl.updated_at
    FROM driver_locations dl
    WHERE 
        dl.is_available = true
        AND ST_DWithin(
            dl.location,
            ST_SetSRID(ST_MakePoint(pickup_longitude, pickup_latitude), 4326)::geography,
            radius_meters
        )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO users (did, display_name, user_type) VALUES
--     ('did:plc:test_rider_1', 'Test Rider', 'rider'),
--     ('did:plc:test_driver_1', 'Test Driver', 'driver');

COMMENT ON TABLE users IS 'Stores user profiles with AT Protocol DIDs';
COMMENT ON TABLE user_devices IS 'Stores device tokens for Expo push notifications';
COMMENT ON TABLE rides IS 'Stores ride requests, assignments, and status';
COMMENT ON TABLE driver_locations IS 'Stores real-time driver GPS coordinates with PostGIS geography';
COMMENT ON TABLE ride_history IS 'Audit log of ride status changes';
COMMENT ON FUNCTION find_nearby_drivers IS 'Returns available drivers within radius sorted by distance';
