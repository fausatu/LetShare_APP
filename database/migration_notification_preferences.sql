-- Migration: Add notification_preferences column to users table
-- Stores JSON preferences for notification toggles (messages, requests, accepted, reviews)

ALTER TABLE `users` ADD COLUMN `notification_preferences` JSON DEFAULT NULL AFTER `auto_delete_rejected_conversations`;
