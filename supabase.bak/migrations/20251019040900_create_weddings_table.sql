-- Create weddings table (without user references to avoid circular dependency)
CREATE TABLE weddings (
  -- Primary key (UUID)
  wedding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Wedding information
  wedding_date date NOT NULL,
  qr_code_path varchar(500) DEFAULT NULL,

  -- Timestamps (softdelete support)
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone DEFAULT NULL
);

-- Enable Row Level Security
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;

-- Policy to show only non-deleted records
CREATE POLICY "Show non-deleted weddings"
ON weddings FOR SELECT
USING (deleted_at IS NULL);

-- Create indexes for performance
CREATE INDEX idx_weddings_wedding_date ON weddings(wedding_date);
CREATE INDEX idx_weddings_deleted_at ON weddings(deleted_at);

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_weddings_updated_at
BEFORE UPDATE ON weddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
