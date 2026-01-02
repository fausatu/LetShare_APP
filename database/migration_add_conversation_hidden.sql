-- Migration: Add hidden_by_user_id to conversations table
-- This allows users to hide conversations for themselves without affecting the other user

USE letshare_db;

-- Add hidden_by_user_id column (NULL means not hidden, user_id means hidden by that user)
ALTER TABLE conversations 
ADD COLUMN hidden_by_user_id INT NULL DEFAULT NULL,
ADD FOREIGN KEY (hidden_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
ADD INDEX idx_hidden_by_user_id (hidden_by_user_id);

