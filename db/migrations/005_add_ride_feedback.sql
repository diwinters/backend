-- Add rider_feedback and updated_at columns to rides table
-- This allows riders to provide written feedback along with their rating

ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS rider_feedback TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ride_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ride_timestamp'
    ) THEN
        CREATE TRIGGER update_ride_timestamp
        BEFORE UPDATE ON rides
        FOR EACH ROW
        EXECUTE FUNCTION update_ride_updated_at();
    END IF;
END $$;
