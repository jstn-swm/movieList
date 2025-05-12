-- Add is_recommendation column to the movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS is_recommendation BOOLEAN DEFAULT FALSE;

-- Drop existing RLS policies so we can replace them with the new ones
DROP POLICY IF EXISTS "Users can only view their own movies" ON movies;
DROP POLICY IF EXISTS "Users can insert their own movies" ON movies;
DROP POLICY IF EXISTS "Users can update their own movies" ON movies;
DROP POLICY IF EXISTS "Users can delete their own movies" ON movies;
DROP POLICY IF EXISTS "Allow public access to public movies" ON movies;

-- Create updated policies that support recommendations
-- Users can view their own movies AND any movies marked as recommendations
CREATE POLICY "Users can view their own movies and recommendations" 
ON movies FOR SELECT 
USING ((auth.uid()::text = user_id) OR (is_recommendation = TRUE));

-- Users can only insert their own movies (unchanged)
CREATE POLICY "Users can insert their own movies" 
ON movies FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own movies (unchanged)
CREATE POLICY "Users can update their own movies" 
ON movies FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Users can only delete their own movies (unchanged)
CREATE POLICY "Users can delete their own movies" 
ON movies FOR DELETE 
USING (auth.uid()::text = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_movies_user_id ON movies(user_id);
CREATE INDEX IF NOT EXISTS idx_movies_recommendation ON movies(is_recommendation);
