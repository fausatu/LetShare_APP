-- Migration: Replace single hidden_by_user_id with per-user hidden flags
-- This allows BOTH users to hide the same conversation independently

-- Add two boolean columns
ALTER TABLE conversations
ADD COLUMN hidden_by_owner TINYINT(1) NOT NULL DEFAULT 0 AFTER hidden_by_user_id,
ADD COLUMN hidden_by_requester TINYINT(1) NOT NULL DEFAULT 0 AFTER hidden_by_owner;

-- Migrate existing data: if hidden_by_user_id = owner_id, mark hidden_by_owner
UPDATE conversations SET hidden_by_owner = 1 WHERE hidden_by_user_id IS NOT NULL AND hidden_by_user_id = owner_id;

-- Migrate existing data: if hidden_by_user_id = requester_id, mark hidden_by_requester
UPDATE conversations SET hidden_by_requester = 1 WHERE hidden_by_user_id IS NOT NULL AND hidden_by_user_id = requester_id;

-- Drop the old column and its index/foreign key
-- Find and drop the foreign key on hidden_by_user_id dynamically
-- If the FK name differs across environments, run this to find it:
--   SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
--   WHERE TABLE_NAME='conversations' AND COLUMN_NAME='hidden_by_user_id' AND REFERENCED_TABLE_NAME IS NOT NULL;
-- Then replace the name below accordingly.

-- Try common FK names (ignore errors if already dropped)
SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' 
    AND COLUMN_NAME = 'hidden_by_user_id' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);

SET @drop_fk = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE conversations DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversations' AND INDEX_NAME = 'idx_hidden_by_user_id');

SET @drop_idx = IF(@idx_exists > 0, 'ALTER TABLE conversations DROP INDEX idx_hidden_by_user_id', 'SELECT 1');
PREPARE stmt FROM @drop_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE conversations DROP COLUMN hidden_by_user_id;
