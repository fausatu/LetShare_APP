-- Migration: Add new features (Universities, Notifications, Multiple Photos, Moderation, Feedback, Chat improvements)
-- Run this migration to add all new features

USE letshare_db;

-- 1. Add universities table
CREATE TABLE IF NOT EXISTS universities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some default universities
INSERT INTO universities (name, code) VALUES
('University of Paris', 'UP'),
('Sorbonne University', 'SU'),
('University of Lyon', 'UL')
ON DUPLICATE KEY UPDATE name=name;

-- 2. Add university_id to users table
ALTER TABLE users 
ADD COLUMN university_id INT NULL AFTER department,
ADD FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
ADD INDEX idx_university_id (university_id);

-- Update existing users to have a default university (optional)
UPDATE users SET university_id = 1 WHERE university_id IS NULL LIMIT 100;

-- 3. Add university_id to items table (items belong to user's university)
-- We'll filter by user's university, but we can also add it directly to items for performance
ALTER TABLE items 
ADD COLUMN university_id INT NULL AFTER user_id,
ADD INDEX idx_university_id (university_id);

-- Update existing items to have university_id from their owner
UPDATE items i
INNER JOIN users u ON i.user_id = u.id
SET i.university_id = u.university_id
WHERE i.university_id IS NULL;

-- 4. Create item_images table for multiple photos
CREATE TABLE IF NOT EXISTS item_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    image_url LONGTEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_item_id (item_id),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing single images to item_images
INSERT INTO item_images (item_id, image_url, display_order)
SELECT id, image, 0 FROM items WHERE image IS NOT NULL AND image != ''
ON DUPLICATE KEY UPDATE image_url=image_url;

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('message', 'request', 'acceptance', 'rejection', 'completion', 'review', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_item_id INT NULL,
    related_conversation_id INT NULL,
    related_user_id INT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (related_conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_read_status (read_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Add read receipts and typing indicators to messages
ALTER TABLE messages 
ADD COLUMN read_at TIMESTAMP NULL AFTER read_status,
ADD INDEX idx_read_at (read_at);

-- Add typing indicator tracking (we'll use a separate table for real-time)
CREATE TABLE IF NOT EXISTS typing_indicators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_conversation_user (conversation_id, user_id),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create moderation reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_user_id INT NOT NULL,
    reported_item_id INT NULL,
    reported_user_id INT NULL,
    report_type ENUM('inappropriate_content', 'spam', 'fraud', 'harassment', 'other') NOT NULL,
    description TEXT,
    status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create feedback table for post-exchange feedback
CREATE TABLE IF NOT EXISTS exchange_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    feedback_type ENUM('positive', 'neutral', 'negative') NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    would_recommend BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_conversation_user (conversation_id, user_id),
    INDEX idx_feedback_type (feedback_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Add condition field to items (for advanced filters)
ALTER TABLE items 
ADD COLUMN condition_status ENUM('new', 'excellent', 'good', 'fair', 'poor') NULL AFTER description,
ADD INDEX idx_condition_status (condition_status);

-- 10. Add search preferences for matching system
CREATE TABLE IF NOT EXISTS user_search_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    preferred_departments TEXT,
    preferred_item_types TEXT,
    saved_searches TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Add online status tracking
ALTER TABLE users 
ADD COLUMN last_seen TIMESTAMP NULL AFTER updated_at,
ADD INDEX idx_last_seen (last_seen);

-- 12. Add item condition and availability filters
ALTER TABLE items 
ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE AFTER status,
ADD INDEX idx_is_urgent (is_urgent);

