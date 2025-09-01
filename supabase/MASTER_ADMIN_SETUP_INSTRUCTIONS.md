# Master Admin Account Setup Instructions

This guide provides step-by-step instructions to create a master admin account in your Supabase database with full system privileges.

## Master Admin Account Details

- **Email**: `master@shiftlink.com`
- **Password**: `Wkdrn123@@`
- **Role**: `admin` with super admin privileges
- **Access Level**: Cross-tenant access with full system administration capabilities

## Prerequisites

1. Supabase project must be set up and running
2. Database migrations must be applied (initial_schema.sql, extended_schema.sql, rls_policies.sql)
3. Access to Supabase Dashboard or Supabase CLI
4. Database admin privileges

## Execution Order

Execute the scripts in this exact order:

### 1. Create Master Admin Account
```bash
# Option A: Using Supabase CLI (Recommended)
supabase db reset  # If needed to reset database
supabase db push   # Apply migrations first
supabase sql --file supabase/create_master_admin.sql

# Option B: Using Supabase Dashboard
# 1. Go to your Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy and paste the content of create_master_admin.sql
# 4. Click "RUN" to execute
```

### 2. Apply Master Admin RLS Policies
```bash
# Option A: Using Supabase CLI
supabase sql --file supabase/master_admin_rls_policies.sql

# Option B: Using Supabase Dashboard
# 1. In SQL Editor, copy and paste content of master_admin_rls_policies.sql
# 2. Click "RUN" to execute
```

### 3. Verify Account Creation
```bash
# Option A: Using Supabase CLI
supabase sql --file supabase/verify_master_admin.sql

# Option B: Using Supabase Dashboard
# 1. In SQL Editor, copy and paste content of verify_master_admin.sql
# 2. Click "RUN" to execute and check the output
```

## Alternative: Create Auth User via Supabase Dashboard

If the direct SQL approach doesn't work for creating the auth user, follow these steps:

### Method 1: Using Supabase Auth Dashboard
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Enter:
   - Email: `master@shiftlink.com`
   - Password: `Wkdrn123@@`
   - Auto Confirm User: `Yes`
4. After user is created, note the User ID
5. Modify the create_master_admin.sql script to use this User ID instead of creating a new one

### Method 2: Using Supabase CLI
```bash
# Create auth user via CLI
supabase auth admin create-user \
  --email master@shiftlink.com \
  --password Wkdrn123@@ \
  --email-confirm

# Then run the modified SQL script
```

## What Each Script Does

### create_master_admin.sql
- Creates auth user in auth.users table
- Creates master organization (tenant)
- Creates headquarters site
- Creates system administration team
- Creates master admin employee record
- Sets up default rulesets and shift templates
- Logs the creation in audit logs

### master_admin_rls_policies.sql
- Creates helper functions for master admin detection
- Adds RLS policies allowing master admin to access all tenants
- Provides cross-tenant access for all tables
- Creates master admin dashboard function
- Ensures master admin can bypass normal tenant restrictions

### verify_master_admin.sql
- Verifies all components were created correctly
- Tests data access across all tables
- Displays master admin account details
- Provides verification summary
- Shows login information

## Expected Capabilities

After successful setup, the master admin account will have:

✅ **Full System Access**
- View and manage all tenants/organizations
- Access all sites across all tenants
- Manage all teams and employees
- View and modify all schedules

✅ **Administrative Privileges**
- Create/modify/delete any data
- Access audit logs system-wide
- Manage integrations and settings
- Override RLS policies

✅ **Cross-Tenant Operations**
- Switch between different organizations
- Perform system-wide operations
- Access consolidated reporting
- Manage multi-tenant configurations

## Security Considerations

⚠️ **Important Security Notes:**

1. **Change Password**: Change the default password immediately after first login
2. **Limit Usage**: Use this account only for system administration
3. **Audit Logging**: All actions are logged in audit_logs table
4. **Network Security**: Ensure proper firewall and VPN protection
5. **Regular Monitoring**: Monitor usage through audit logs

## Troubleshooting

### Common Issues

**Issue**: Auth user creation fails
- **Solution**: Use Supabase Dashboard to create user manually, then modify script

**Issue**: RLS policies don't work
- **Solution**: Ensure all migrations are applied and user is authenticated

**Issue**: Cannot access other tenants
- **Solution**: Verify master_admin flag is set to true in tenant settings

**Issue**: Functions don't exist
- **Solution**: Ensure master_admin_rls_policies.sql was executed successfully

### Verification Queries

Run these queries to verify setup:

```sql
-- Check if master admin user exists
SELECT * FROM auth.users WHERE email = 'master@shiftlink.com';

-- Check if master admin employee exists
SELECT * FROM employees WHERE email = 'master@shiftlink.com';

-- Check if master tenant exists
SELECT * FROM tenants WHERE slug = 'master-org';

-- Test master admin function
SELECT is_master_admin(); -- Should return true when authenticated as master admin
```

## Next Steps After Setup

1. **First Login**: Login to your ShiftLink application using the credentials
2. **Password Change**: Update the password through the UI
3. **Create Additional Tenants**: Set up other organizations as needed
4. **Configure Settings**: Set up system-wide configurations
5. **User Management**: Create other admin and manager accounts
6. **Monitoring**: Set up monitoring for the master admin account usage

## Support

If you encounter issues during setup:

1. Check the Supabase logs for detailed error messages
2. Verify all prerequisite migrations are applied
3. Ensure you have proper database admin privileges
4. Review the verification script output for specific failures

Remember to secure this account properly as it has full system access!