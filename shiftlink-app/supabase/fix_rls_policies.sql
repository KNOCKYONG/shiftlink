-- Fix RLS policies for signup process

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can create tenants during signup" ON tenants;
DROP POLICY IF EXISTS "Users can create sites during signup" ON sites;
DROP POLICY IF EXISTS "Users can create teams during signup" ON teams;
DROP POLICY IF EXISTS "Users can create employee records during signup" ON employees;

-- Add INSERT policies for signup process
CREATE POLICY "Users can create tenants during signup" ON tenants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can create sites during signup" ON sites
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can create teams during signup" ON teams
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can create employee records during signup" ON employees
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
  );