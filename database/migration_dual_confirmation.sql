-- Migration: Add dual confirmation system for exchanges
-- Date: 2026

USE letshare_db;

-- Add individual confirmation tracking for exchanges
-- These fields will track who has confirmed completion of an exchange

ALTER TABLE conversations 
ADD COLUMN owner_confirmed_at TIMESTAMP NULL AFTER status,
ADD COLUMN requester_confirmed_at TIMESTAMP NULL AFTER owner_confirmed_at,
ADD COLUMN confirmation_reminder_sent_at TIMESTAMP NULL AFTER requester_confirmed_at;

-- Add new status for partial confirmation (when only one person has confirmed)
ALTER TABLE conversations 
MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'partial_confirmed') DEFAULT 'pending';

-- Add indexes for performance
ALTER TABLE conversations 
ADD INDEX idx_owner_confirmed (owner_confirmed_at),
ADD INDEX idx_requester_confirmed (requester_confirmed_at),
ADD INDEX idx_confirmation_reminder (confirmation_reminder_sent_at);