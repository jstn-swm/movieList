-- Enable Row Level Security on the movies table
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own movies and recommendations from others
CREATE POLICY "Users can view their own movies and recommendations" 
  ON movies FOR SELECT USING (auth.uid()::text = user_id OR is_recommendation = true);

-- Create policy for users to insert their own movies
CREATE POLICY "Users can insert their own movies" 
  ON movies FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create policy for users to update their own movies
CREATE POLICY "Users can update their own movies" 
  ON movies FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policy for users to delete their own movies
CREATE POLICY "Users can delete their own movies" 
  ON movies FOR DELETE USING (auth.uid()::text = user_id);
  
-- Allow anonymous users to view recommended movies
CREATE POLICY "Allow anonymous access to recommended movies" 
  ON movies FOR SELECT TO anon USING (is_recommendation = true);