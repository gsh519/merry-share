-- Initial setup for PlanetScale compatible MySQL
CREATE DATABASE IF NOT EXISTS merry_share;
USE merry_share;

-- Set MySQL configuration for PlanetScale compatibility
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- Create a user for the application (optional, for better security)
-- CREATE USER 'app_user'@'%' IDENTIFIED BY 'app_password';
-- GRANT ALL PRIVILEGES ON merry_share.* TO 'app_user'@'%';
-- FLUSH PRIVILEGES;