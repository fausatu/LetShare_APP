-- Migration: Password Reset Functionality
-- This migration adds password reset token support

USE letshare_db;

-- Add password reset fields to users table
ALTER TABLE users 
ADD COLUMN password_reset_token VARCHAR(255) NULL AFTER password,
ADD COLUMN password_reset_expires_at TIMESTAMP NULL AFTER password_reset_token,
ADD INDEX idx_password_reset_token (password_reset_token);

