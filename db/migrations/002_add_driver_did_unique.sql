-- Add unique constraint on driver_did in driver_locations table
-- This is required for the ON CONFLICT (driver_did) clause to work

-- First, remove any duplicate driver_did entries (keep the most recent one)
DELETE FROM driver_locations a
USING driver_locations b
WHERE a.id < b.id
  AND a.driver_did = b.driver_did;

-- Now add the unique constraint
ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_driver_did_key UNIQUE (driver_did);
