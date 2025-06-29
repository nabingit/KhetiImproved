/*
  # Create applications table

  1. New Tables
    - `applications`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs.id)
      - `worker_id` (uuid, references profiles.id)
      - `worker_name` (text, not null)
      - `worker_email` (text, not null)
      - `message` (text, optional)
      - `status` (text, default 'pending')
      - `applied_at` (timestamptz, default now)
      - `rejected_at` (timestamptz, optional)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `applications` table
    - Add policy for workers to manage their own applications
    - Add policy for farmers to view applications for their jobs
    - Add policy for farmers to update application status

  3. Constraints
    - Unique constraint on (job_id, worker_id) to prevent duplicate applications
*/

-- Create custom types
CREATE TYPE application_status_enum AS ENUM ('pending', 'accepted', 'rejected');

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worker_name text NOT NULL,
  worker_email text NOT NULL,
  message text,
  status application_status_enum DEFAULT 'pending',
  applied_at timestamptz DEFAULT now(),
  rejected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate applications
  UNIQUE(job_id, worker_id)
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workers can create their own applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Workers can read their own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can update their own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = worker_id);

CREATE POLICY "Farmers can read applications for their jobs"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.farmer_id = auth.uid()
    )
  );

CREATE POLICY "Farmers can update applications for their jobs"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.farmer_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);