-- Migration: Add new notification types
-- Run this migration to add 'item_deleted' and 'conversation_cancelled' notification types

USE letshare_db;

-- Add new notification types to the ENUM
ALTER TABLE notifications 
MODIFY COLUMN type ENUM('message', 'request', 'acceptance', 'rejection', 'completion', 'review', 'system', 'item_deleted', 'conversation_cancelled') NOT NULL;

