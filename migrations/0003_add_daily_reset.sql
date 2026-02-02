-- Migration number: 0003    2025-02-02
-- Add last_reset_date for daily usage reset tracking

ALTER TABLE vendor_keys ADD COLUMN last_reset_date TEXT DEFAULT (date('now'));
