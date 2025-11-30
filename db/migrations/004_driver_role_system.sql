-- Migration: Enhance driver/livreur role management
-- This creates a proper driver role system managed by admin dashboard

-- 1. Update user_type to support livreur
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('rider', 'driver', 'livreur', 'both'));

-- 2. Add driver_role field to distinguish between taxi and delivery drivers
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_role VARCHAR(20);
ALTER TABLE users ADD CONSTRAINT users_driver_role_check 
CHECK (driver_role IS NULL OR driver_role IN ('taxi', 'delivery'));

-- 3. Add approved_driver flag - only approved drivers can go online
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_driver BOOLEAN DEFAULT false;

-- 4. Add approved_by and approved_at for audit trail
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES admin_users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- 5. Create index for fast driver lookups
CREATE INDEX IF NOT EXISTS idx_users_approved_driver ON users(approved_driver) WHERE approved_driver = true;
CREATE INDEX IF NOT EXISTS idx_users_driver_role ON users(driver_role) WHERE driver_role IS NOT NULL;

-- 6. Add comments
COMMENT ON COLUMN users.driver_role IS 'Type of driver: taxi (passenger rides) or delivery (package delivery)';
COMMENT ON COLUMN users.approved_driver IS 'Whether user is approved to operate as driver/livreur';
COMMENT ON COLUMN users.approved_by IS 'Admin user who approved this driver';
COMMENT ON COLUMN users.approved_at IS 'When driver was approved';

-- 7. Update existing drivers to be approved (migration safety)
UPDATE users 
SET approved_driver = true, 
    driver_role = 'taxi',
    approved_at = NOW()
WHERE user_type IN ('driver', 'both');
