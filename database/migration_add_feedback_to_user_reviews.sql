-- Migration: Add feedback fields to user_reviews table
-- Adds feedback_type and would_recommend fields from exchange_feedback system

ALTER TABLE user_reviews 
ADD COLUMN feedback_type ENUM('positive','neutral','negative') DEFAULT 'positive' AFTER rating,
ADD COLUMN would_recommend TINYINT(1) DEFAULT NULL AFTER feedback_type;
