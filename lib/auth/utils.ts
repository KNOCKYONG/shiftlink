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
  
  // Get employee data - auth_user_id로 먼저 시도
  let employee = null
  let error = null
  
  // 1. auth_user_id로 조회
  const { data: emp1, error: err1 } = await supabase
    .from('employees')
    .select(`
      id, 
      name, 
      role, 
      tenant_id, 
      team_id, 
      is_active,
      auth_user_id,
      email
    `)
    .eq('auth_user_id', user.id)
    .single()
  
  if (!err1 && emp1) {
    employee = emp1
  } else {
    // 2. email로 조회 (fallback)
    const { data: emp2, error: err2 } = await supabase
      .from('employees')
      .select(`
        id, 
        name, 
        role, 
        tenant_id, 
        team_id, 
        is_active,
        auth_user_id,
        email
      `)
      .eq('email', user.email)
      .single()
    
    if (!err2 && emp2) {
      employee = emp2
      // auth_user_id 업데이트
      if (!emp2.auth_user_id) {
        await supabase
          .from('employees')
          .update({ auth_user_id: user.id })
          .eq('id', emp2.id)
      }
    } else {
      error = err2 || err1
    }
  }
  
  if (error || !employee) {
    console.error('Employee lookup error in utils:', error)
    return null
  }
  
  if (!employee.is_active) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email!,
    name: employee.name || user.email!.split('@')[0],
    role: employee.role as UserRole,
    tenantId: employee.tenant_id || '',
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