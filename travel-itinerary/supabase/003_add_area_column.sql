-- Add area/neighborhood column to attractions table
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS area TEXT;

-- Add source_note column if not exists
ALTER TABLE attractions ADD COLUMN IF NOT EXISTS source_note TEXT;

-- Create index for area-based queries
CREATE INDEX IF NOT EXISTS idx_attractions_area ON attractions(area);
