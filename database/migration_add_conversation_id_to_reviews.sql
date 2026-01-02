-- Migration: Add conversation_id to user_reviews table
-- This allows users to leave multiple reviews for the same user (one per completed exchange)

USE letshare_db;

-- Add conversation_id column to user_reviews table
ALTER TABLE user_reviews 
ADD COLUMN conversation_id INT NULL AFTER reviewer_user_id,
ADD FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
ADD INDEX idx_conversation_id (conversation_id);

-- Update existing reviews to link them to their conversation if possible
-- This is a one-time migration for existing data
-- Note: This might not work perfectly if there are multiple completed conversations between the same users
UPDATE user_reviews ur
INNER JOIN conversations c ON (
    (c.owner_id = ur.reviewed_user_id AND c.requester_id = ur.reviewer_user_id) OR
    (c.owner_id = ur.reviewer_user_id AND c.requester_id = ur.reviewed_user_id)
)
SET ur.conversation_id = c.id
WHERE c.status = 'completed'
AND ur.conversation_id IS NULL
LIMIT 1; -- Only link to first completed conversation to avoid duplicates

