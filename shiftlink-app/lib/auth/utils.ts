import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'manager' | 'employee'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  tenantId: string
  teamId?: string
  employeeId: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // Get employee data with tenant info
  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      id, 
      name, 
      role, 
      tenant_id, 
      team_id, 
      is_active,
      tenants(id, name, is_active)
    `)
    .eq('auth_user_id', user.id)
    .single()
    
  if (error || !employee || !employee.is_active || !employee.tenants?.is_active) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email!,
    name: employee.name,
    role: employee.role as UserRole,
    tenantId: employee.tenant_id,
    teamId: employee.team_id,
    employeeId: employee.id
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }
  return user
}

export async function requireAdmin() {
  return requireRole(['admin'])
}

export async function requireManagerOrAdmin() {
  return requireRole(['admin', 'manager'])
}