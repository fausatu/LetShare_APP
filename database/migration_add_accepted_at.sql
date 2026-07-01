-- Migration: Add accepted_at column to conversations table
-- This column tracks precisely when a conversation was accepted,
-- instead of relying on updated_at which can be modified by other operations.
-- Used by auto_complete_exchanges.php for donation reminder timings (5d, 10d, 11d).

ALTER TABLE `conversations`
  ADD COLUMN `accepted_at` TIMESTAMP NULL DEFAULT NULL AFTER `status`;

-- Add index for performance (used in cron queries)
ALTER TABLE `conversations`
  ADD KEY `idx_accepted_at` (`accepted_at`);

-- Backfill: set accepted_at = updated_at for existing accepted/completed/partial_confirmed conversations
UPDATE `conversations`
SET `accepted_at` = `updated_at`
WHERE `status` IN ('accepted', 'completed', 'partial_confirmed')
  AND `accepted_at` IS NULL;
