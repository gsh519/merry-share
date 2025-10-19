-- Create medias table
CREATE TABLE medias (
  -- Primary key (UUID)
  media_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  wedding_id uuid NOT NULL REFERENCES weddings(wedding_id) ON DELETE RESTRICT,
  posted_by uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  -- Media information
  media_path varchar(500) NOT NULL,
  posted_at timestamp with time zone DEFAULT now() NOT NULL,

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
ALTER TABLE medias ENABLE ROW LEVEL SECURITY;

-- Policy to show only non-deleted records
CREATE POLICY "Show non-deleted medias"
ON medias FOR SELECT
USING (deleted_at IS NULL);

-- Create indexes for performance
CREATE INDEX idx_medias_wedding_id ON medias(wedding_id);
CREATE INDEX idx_medias_posted_by ON medias(posted_by);
CREATE INDEX idx_medias_posted_at ON medias(posted_at);
CREATE INDEX idx_medias_deleted_at ON medias(deleted_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_medias_updated_at
BEFORE UPDATE ON medias
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
