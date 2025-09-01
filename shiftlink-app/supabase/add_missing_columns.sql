-- ==============================================
-- Add Missing Columns to schedule_assignments
-- ==============================================
-- These columns are referenced in monitoring_analytics.sql
-- ==============================================

-- Add shift_type column to track the type of shift
ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) 
CHECK (shift_type IN ('day', 'evening', 'night', 'off'));

-- Add shift_date column for easier date queries
ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS shift_date DATE;

-- Add actual start/end times for tracking actual worked hours
ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;

ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;

-- Add status column for tracking assignment status
ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed'
CHECK (status IN ('draft', 'confirmed', 'cancelled', 'modified'));

-- Update shift_date from the date column
UPDATE schedule_assignments 
SET shift_date = date 
WHERE shift_date IS NULL;

-- Update shift_type based on start_time
UPDATE schedule_assignments 
SET shift_type = CASE
    WHEN EXTRACT(HOUR FROM start_time) >= 6 AND EXTRACT(HOUR FROM start_time) < 14 THEN 'day'
    WHEN EXTRACT(HOUR FROM start_time) >= 14 AND EXTRACT(HOUR FROM start_time) < 22 THEN 'evening'
    WHEN EXTRACT(HOUR FROM start_time) >= 22 OR EXTRACT(HOUR FROM start_time) < 6 THEN 'night'
    ELSE 'day'
END
WHERE shift_type IS NULL;

-- Set actual times to scheduled times initially
UPDATE schedule_assignments 
SET actual_start_time = start_time,
    actual_end_time = end_time
WHERE actual_start_time IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_shift_date 
ON schedule_assignments(shift_date);

CREATE INDEX IF NOT EXISTS idx_schedule_assignments_shift_type 
ON schedule_assignments(shift_type);

CREATE INDEX IF NOT EXISTS idx_schedule_assignments_status 
ON schedule_assignments(status);

CREATE INDEX IF NOT EXISTS idx_schedule_assignments_employee_date 
ON schedule_assignments(employee_id, shift_date);

-- Add comment to explain the purpose
COMMENT ON COLUMN schedule_assignments.shift_type IS 'Type of shift: day, evening, night, or off';
COMMENT ON COLUMN schedule_assignments.shift_date IS 'Date of the shift (denormalized from date column for easier queries)';
COMMENT ON COLUMN schedule_assignments.actual_start_time IS 'Actual start time (for tracking overtime)';
COMMENT ON COLUMN schedule_assignments.actual_end_time IS 'Actual end time (for tracking overtime)';
COMMENT ON COLUMN schedule_assignments.status IS 'Status of the assignment: draft, confirmed, cancelled, modified';