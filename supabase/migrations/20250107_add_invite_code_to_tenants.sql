-- Add invite_code column to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(8) UNIQUE;

-- Function to generate random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update existing tenants with invite codes
UPDATE tenants 
SET invite_code = generate_invite_code()
WHERE invite_code IS NULL;

-- Make invite_code NOT NULL after updating existing records
ALTER TABLE tenants 
ALTER COLUMN invite_code SET NOT NULL;

-- Add unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_invite_code_key'
  ) THEN
    ALTER TABLE tenants 
    ADD CONSTRAINT tenants_invite_code_key UNIQUE (invite_code);
  END IF;
END $$;

-- Create function to regenerate invite code
CREATE OR REPLACE FUNCTION regenerate_invite_code(tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    new_code := generate_invite_code();
    
    BEGIN
      UPDATE tenants 
      SET invite_code = new_code,
          updated_at = NOW()
      WHERE id = tenant_id;
      
      RETURN new_code;
    EXCEPTION 
      WHEN unique_violation THEN
        IF attempt >= max_attempts THEN
          RAISE EXCEPTION 'Could not generate unique invite code after % attempts', max_attempts;
        END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate invite code
CREATE OR REPLACE FUNCTION validate_invite_code(code TEXT)
RETURNS TABLE(tenant_id UUID, tenant_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT id, name
  FROM tenants
  WHERE invite_code = UPPER(code);
END;
$$ LANGUAGE plpgsql;