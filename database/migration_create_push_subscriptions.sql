-- Create push_subscriptions table for browser push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_endpoint (endpoint(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add unique constraint
ALTER TABLE push_subscriptions 
ADD UNIQUE KEY unique_user_endpoint (user_id, endpoint(255));

-- Add foreign key (if users table exists)
ALTER TABLE push_subscriptions 
ADD CONSTRAINT fk_push_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

