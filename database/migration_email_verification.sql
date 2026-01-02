-- Migration: Email Verification System
-- This migration adds email verification support to ensure emails are real

USE letshare_db;

-- Add email verification fields to users table
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email,
ADD COLUMN email_verification_token VARCHAR(255) NULL AFTER email_verified,
ADD COLUMN email_verification_token_expires_at TIMESTAMP NULL AFTER email_verification_token,
ADD INDEX idx_email_verification_token (email_verification_token),
ADD INDEX idx_email_verified (email_verified);

-- For Google OAuth users, mark email as verified automatically (Google already verified it)
UPDATE users SET email_verified = TRUE WHERE auth_provider = 'google';

-- For existing users with email auth, mark as verified (grandfather clause)
-- You can change this to FALSE if you want to force verification for existing users
UPDATE users SET email_verified = TRUE WHERE auth_provider = 'email' AND email_verified = FALSE;

