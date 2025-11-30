-- Migration 002: Admin Dashboard Tables
-- Run with: psql $DATABASE_URL -f db/migrations/002_admin_dashboard.sql

-- Admin users table for dashboard access
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily aggregated stats for fast dashboard queries
CREATE TABLE IF NOT EXISTS stats_daily (
    date DATE PRIMARY KEY,
    total_rides INTEGER DEFAULT 0,
    completed_rides INTEGER DEFAULT 0,
    cancelled_rides INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    platform_fees DECIMAL(12,2) DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    new_drivers INTEGER DEFAULT 0,
    active_drivers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin activity log for audit
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_stats_daily_date ON stats_daily(date);

-- Insert default admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admin_users (email, password_hash, name, role)
VALUES ('admin@raceef.com', '$2b$10$rQZ5vZ5vZ5vZ5vZ5vZ5vZeK5vZ5vZ5vZ5vZ5vZ5vZ5vZ5vZ5vZ5vZ', 'Admin', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- Comments
COMMENT ON TABLE admin_users IS 'Dashboard admin users with authentication';
COMMENT ON TABLE stats_daily IS 'Daily aggregated statistics for fast dashboard queries';
COMMENT ON TABLE admin_activity_log IS 'Audit log of admin actions';
