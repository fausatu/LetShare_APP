-- Fix endpoint column to support long URLs
-- Push notification endpoints can be very long (500+ characters)

-- First, check current structure
-- DESCRIBE push_subscriptions;

-- Drop unique constraint if it exists (it causes issues with TEXT columns)
ALTER TABLE push_subscriptions DROP INDEX IF EXISTS unique_user_endpoint;

-- If endpoint is VARCHAR, change it to TEXT
ALTER TABLE push_subscriptions 
MODIFY COLUMN endpoint TEXT NOT NULL;

-- Note: We don't recreate the unique constraint because TEXT columns
-- require prefix length which can cause MySQL errors.
-- Uniqueness is handled in application code instead.

-- Verify the change
-- DESCRIBE push_subscriptions;

