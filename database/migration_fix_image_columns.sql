-- Migration: Fix image columns to support long base64 strings
-- Change TEXT to LONGTEXT for image storage

USE letshare_db;

-- Fix item_images.image_url column
ALTER TABLE item_images 
MODIFY COLUMN image_url LONGTEXT NOT NULL;

-- Fix items.image column (for backward compatibility)
ALTER TABLE items 
MODIFY COLUMN image LONGTEXT;

-- Also check other TEXT columns that might store base64
-- Fix users.avatar if it exists
ALTER TABLE users 
MODIFY COLUMN avatar LONGTEXT;

