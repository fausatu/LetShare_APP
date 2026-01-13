-- Add column to track when user was last notified about terms update
ALTER TABLE users ADD COLUMN last_terms_notification DATETIME DEFAULT NULL;

-- Add index for efficient querying
CREATE INDEX idx_terms_notification ON users(terms_version, last_terms_notification);
