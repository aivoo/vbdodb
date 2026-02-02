-- Migration number: 0002    2025-02-02
-- Create vendor_keys table for storing supplier API keys
CREATE TABLE IF NOT EXISTS vendor_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    usage_limit INTEGER DEFAULT 500,
    used_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create custom_keys table for storing user-defined API keys
CREATE TABLE IF NOT EXISTS custom_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    usage_limit INTEGER DEFAULT -1,
    used_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_keys_active ON vendor_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_keys_api_key ON vendor_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_custom_keys_active ON custom_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_keys_api_key ON custom_keys(api_key);
