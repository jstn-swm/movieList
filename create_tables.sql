-- Create movies table
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Changed from UUID to TEXT to allow both UUIDs and the string "public"
  title TEXT NOT NULL,
  description TEXT,
  year TEXT,
  watched BOOLEAN DEFAULT FALSE,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movies_updated_at
BEFORE UPDATE ON movies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Apply the RLS policies from rls_policies.sql after creating the table
-- Enable Row Level Security on the movies table
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own movies
CREATE POLICY "Users can only view their own movies" 
  ON movies FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy for users to insert their own movies
CREATE POLICY "Users can insert their own movies" 
  ON movies FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create policy for users to update their own movies
CREATE POLICY "Users can update their own movies" 
  ON movies FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policy for users to delete their own movies
CREATE POLICY "Users can delete their own movies" 
  ON movies FOR DELETE USING (auth.uid()::text = user_id);

-- Allow public access for the demo app (optional)
-- This allows accessing movies with user_id = 'public'
CREATE POLICY "Allow public access to public movies" 
  ON movies FOR ALL USING (user_id = 'public');