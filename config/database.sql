-- =============================================
-- BrightPathHorizon CRM Database Setup
-- Run this file once to initialize your database
-- =============================================

-- Create database
-- CREATE DATABASE IF NOT EXISTS brightpathhorizon 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- USE brightpathhorizon;

-- =============================================
-- USERS TABLE
-- Stores admin and BDE user accounts
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,         -- bcrypt hashed
  role ENUM('admin', 'bde') NOT NULL DEFAULT 'bde',
  is_active TINYINT(1) DEFAULT 1,         -- soft disable accounts
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- LEADS TABLE
-- Core CRM data - all client leads
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  source ENUM('LinkedIn', 'Website', 'Referral', 'Instagram', 'Other') NOT NULL DEFAULT 'Other',
  project_type VARCHAR(100),
  budget VARCHAR(50),
  status ENUM('New', 'In Progress', 'Closed') NOT NULL DEFAULT 'New',
  follow_up_date DATE,
  comment TEXT,
  assigned_to INT,                        -- FK → users.id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_follow_up_date (follow_up_date)
);

-- =============================================
-- DEFAULT ADMIN ACCOUNT
-- Password: Admin@123 (change immediately after first login)
-- Hash generated with bcrypt rounds=10
-- =============================================
INSERT INTO users (name, email, password, role) 
VALUES (
  'BrightPath Admin', 
  'admin@brightpathhorizon.com', 
  '$2b$10$rOyRwBW5vAXsf5s7MtxFp.bMiKw.q5gYqQFHhJVmR1hT2q6.yVjQa',
  'admin'
) ON DUPLICATE KEY UPDATE id=id;

-- =============================================
-- SAMPLE DATA (optional - remove in production)
-- =============================================
-- INSERT INTO users (name, email, password, role) VALUES
-- ('John BDE', 'john@brightpathhorizon.com', '$2b$10$...', 'bde');
