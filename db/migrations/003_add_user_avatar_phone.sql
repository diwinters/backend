-- Migration: Add avatar_url and phone columns to users table
-- This allows storing full driver information for ride assignments

-- Add avatar_url column
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add phone column  
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Create index on phone for lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.avatar_url IS 'User avatar image URL';
COMMENT ON COLUMN users.phone IS 'User phone number for contact during rides';
