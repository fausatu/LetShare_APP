-- Migration: Add 'cancelled' status to conversations table
-- Run this migration to allow conversations to be marked as cancelled when items are deleted

USE letshare_db;

-- Add 'cancelled' to the status ENUM (must include ALL existing values including partial_confirmed)
ALTER TABLE conversations 
MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'partial_confirmed', 'cancelled') DEFAULT 'pending';

