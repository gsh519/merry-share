-- Create users table
CREATE TABLE users (
  -- Primary key (UUID)
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key (required, restrict delete)
  wedding_id uuid NOT NULL REFERENCES weddings(wedding_id) ON DELETE RESTRICT,

  -- User information
  user_name varchar(100) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,

  -- Timestamps (softdelete support)
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone DEFAULT NULL,

  -- Audit fields
  created_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
  deleted_by uuid REFERENCES users(user_id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy to show only non-deleted records
CREATE POLICY "Show non-deleted users"
ON users FOR SELECT
USING (deleted_at IS NULL);

-- Create indexes for performance
CREATE INDEX idx_users_wedding_id ON users(wedding_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
