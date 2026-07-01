-- Migration: Add image support to messages
-- Date: 2026-04-05

-- Add image column to messages table (LONGTEXT for base64 data)
ALTER TABLE messages ADD COLUMN image LONGTEXT NULL DEFAULT NULL AFTER text;

-- Allow text to be NULL when only an image is sent
ALTER TABLE messages MODIFY COLUMN text TEXT NULL;
