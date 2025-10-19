-- Add audit fields to weddings table (created_by, updated_by, deleted_by)
-- This migration runs after users table is created to avoid circular dependency

ALTER TABLE weddings
ADD COLUMN created_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN updated_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN deleted_by uuid REFERENCES users(user_id) ON DELETE SET NULL;

-- Create indexes for audit fields
CREATE INDEX idx_weddings_created_by ON weddings(created_by);
CREATE INDEX idx_weddings_updated_by ON weddings(updated_by);
CREATE INDEX idx_weddings_deleted_by ON weddings(deleted_by);
