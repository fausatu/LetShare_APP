-- Migration: University Validation and Google Auth Support
-- This migration adds university email validation and Google OAuth support

USE letshare_db;

-- 1. Update universities table to include email_domains
-- Note: Run these one by one if you get "Duplicate column" errors
ALTER TABLE universities ADD COLUMN email_domains JSON AFTER code;
ALTER TABLE universities ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER email_domains;

-- 2. Insert Clermont School of Business as partner university
INSERT INTO universities (name, code, email_domains, is_active) VALUES
('Clermont School of Business', 'CSB', '["@student.clermont-sb.fr", "@clermont-sb.fr"]', TRUE)
ON DUPLICATE KEY UPDATE 
    email_domains = VALUES(email_domains),
    is_active = VALUES(is_active);

-- 3. Make university_id mandatory in users table
-- First, delete all users without university_id (as requested)
DELETE FROM users WHERE university_id IS NULL;

-- Now make university_id NOT NULL
ALTER TABLE users 
MODIFY COLUMN university_id INT NOT NULL,
DROP FOREIGN KEY IF EXISTS users_ibfk_1;

-- Re-add foreign key with proper constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_university 
FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE RESTRICT;

-- 4. Add Google Auth fields to users table
-- Note: Run these one by one if you get "Duplicate column" errors
ALTER TABLE users ADD COLUMN auth_provider ENUM('email', 'google') DEFAULT 'email' AFTER password;
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER auth_provider;
ALTER TABLE users ADD INDEX idx_google_id (google_id);
ALTER TABLE users ADD INDEX idx_auth_provider (auth_provider);

-- 5. Make password nullable (for Google Auth users)
ALTER TABLE users 
MODIFY COLUMN password VARCHAR(255) NULL;

-- 6. Add constraint: password required if auth_provider is 'email'
-- Note: This is enforced at application level, not database level
-- (MySQL doesn't support conditional NOT NULL constraints)

