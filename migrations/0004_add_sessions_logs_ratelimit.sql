-- Migration number: 0004    2026-02-03
-- Add sessions, request logs, and rate limiting tables

-- 1. Session persistence table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 2. Request logs table
CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    custom_key_id INTEGER,
    vendor_key_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (custom_key_id) REFERENCES custom_keys(id),
    FOREIGN KEY (vendor_key_id) REFERENCES vendor_keys(id)
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_custom_key ON request_logs(custom_key_id);

-- 3. Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL, -- 'ip' or 'api_key'
    request_count INTEGER DEFAULT 0,
    window_start TEXT NOT NULL,
    UNIQUE(identifier, identifier_type, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, identifier_type, window_start);

-- 4. Add expires_at field to custom_keys table
ALTER TABLE custom_keys ADD COLUMN expires_at TEXT DEFAULT NULL;
