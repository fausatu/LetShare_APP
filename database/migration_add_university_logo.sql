-- Migration: Add University Logo
-- This migration adds logo path to universities table and updates Clermont School of Business

USE letshare_db;

-- Update Clermont School of Business with logo path
UPDATE universities 
SET logo = 'Univ_Logo/Clermont_SB_logo.jpg'
WHERE code = 'CSB' OR name = 'Clermont School of Business';

