-- Enable Row Level Security on the movies table
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their movies
CREATE POLICY "Users can only view their own movies" 
  ON movies FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own movies
CREATE POLICY "Users can insert their own movies" 
  ON movies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own movies
CREATE POLICY "Users can update their own movies" 
  ON movies FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for users to delete their own movies
CREATE POLICY "Users can delete their own movies" 
  ON movies FOR DELETE USING (auth.uid() = user_id);