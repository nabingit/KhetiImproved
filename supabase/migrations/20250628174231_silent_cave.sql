/*
  # Create users table with authentication integration

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, not null)
      - `contact_number` (text, unique, not null)
      - `user_type` (text, farmer or worker)
      - `location` (text, optional)
      - `date_of_birth` (date, optional)
      - `weight` (numeric, optional for workers)
      - `height` (numeric, optional for workers)
      - `profile_picture` (text, optional)
      - `working_picture` (text, optional)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `profiles` table
    - Add policy for users to read and update their own profile
    - Add policy for authenticated users to read other profiles
*/

-- Create custom types
CREATE TYPE user_type_enum AS ENUM ('farmer', 'worker');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_number text UNIQUE NOT NULL,
  user_type user_type_enum NOT NULL,
  location text,
  date_of_birth date,
  weight numeric(5,2),
  height numeric(5,2),
  profile_picture text,
  working_picture text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can read other profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();