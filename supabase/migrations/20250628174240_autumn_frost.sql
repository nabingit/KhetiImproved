/*
  # Create jobs table

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `farmer_id` (uuid, references profiles.id)
      - `farmer_name` (text, not null)
      - `title` (text, not null)
      - `description` (text, not null)
      - `preferred_date` (date)
      - `wage` (numeric, not null)
      - `duration` (integer, not null)
      - `duration_type` (text, hours or days)
      - `location` (text, not null)
      - `required_workers` (integer, not null, default 1)
      - `accepted_worker_ids` (uuid array, default empty array)
      - `status` (text, default 'open')
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `jobs` table
    - Add policy for farmers to manage their own jobs
    - Add policy for workers to read available jobs
    - Add policy for viewing specific job details
*/

-- Create custom types
CREATE TYPE job_status_enum AS ENUM ('open', 'filled', 'in-progress', 'completed');
CREATE TYPE duration_type_enum AS ENUM ('hours', 'days');

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  farmer_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  preferred_date date,
  wage numeric(10,2) NOT NULL,
  duration integer NOT NULL,
  duration_type duration_type_enum NOT NULL DEFAULT 'hours',
  location text NOT NULL,
  required_workers integer NOT NULL DEFAULT 1,
  accepted_worker_ids uuid[] DEFAULT '{}',
  status job_status_enum DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Farmers can create jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can read their own jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update their own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete their own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = farmer_id);

CREATE POLICY "Workers can read open jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (status = 'open');

CREATE POLICY "Accepted workers can read their assigned jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(accepted_worker_ids));

-- Create updated_at trigger
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_farmer_id ON jobs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_preferred_date ON jobs(preferred_date);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);