-- Migration: Add conversation auto-cleanup preferences
-- Date: 2026

USE letshare_db;

-- Add conversation management preferences columns
-- These settings let users control automatic conversation cleanup

-- Auto-delete rejected conversations (conversations that were auto-rejected when another was accepted)
ALTER TABLE users 
ADD COLUMN auto_delete_rejected_conversations BOOLEAN DEFAULT TRUE 
AFTER allow_messages_from_anyone;

-- Add index for performance
ALTER TABLE users 
ADD INDEX idx_auto_delete_rejected (auto_delete_rejected_conversations);