// Supabase 인증 설정
import { createClient } from '@/lib/supabase/client'

export const authConfig = {
  // 이메일 OTP 설정
  email: {
    enabled: true,
    magicLink: true,
    otpLength: 6,
    otpExpirationTime: 300, // 5분
  },
  
  // OAuth 설정
  oauth: {
    google: {
      enabled: true,
      scopes: ['email', 'profile'],
    },
    microsoft: {
      enabled: true, 
      scopes: ['email', 'profile'],
    }
  },
  
  // 세션 설정
  session: {
    refreshTokenName: 'shiftlink_refresh_token',
    accessTokenName: 'shiftlink_access_token',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
    }
  },

  // 리다이렉트 URL
  redirectUrls: {
    signIn: '/dashboard',
    signOut: '/auth/login',
    emailConfirm: '/auth/confirm',
    passwordReset: '/auth/reset-password',
  }
}

// 역할별 권한 정의
export const rolePermissions = {
  admin: [
    'schedule:create',
    'schedule:edit', 
    'schedule:delete',
    'schedule:view_all',
    'employee:create',
    'employee:edit',
    'employee:delete',
    'employee:view_all',
    'leave:approve',
    'leave:reject',
    'swap:approve',
    'swap:reject',
    'settings:edit',
    'reports:view_all',
    'audit:view'
  ],
  manager: [
    'schedule:create',
    'schedule:edit',
    'schedule:view_team',
    'employee:view_team',
    'leave:approve',
    'leave:reject', 
    'swap:approve',
    'swap:reject',
    'reports:view_team'
  ],
  employee: [
    'schedule:view_own',
    'leave:create',
    'leave:view_own',
    'swap:create',
    'swap:view_own',
    'profile:edit_own'
  ]
}

// 권한 확인 함수
export function hasPermission(userRole: string, permission: string): boolean {
  return rolePermissions[userRole as keyof typeof rolePermissions]?.includes(permission) || false
}

// 다중 권한 확인
export function hasAnyPermission(userRole: string, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

// 인증 상태 확인
export async function getCurrentUser() {
  const supabase = createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    // 직원 정보 조회
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        email,
        role,
        level,
        tenant_id,
        team_id,
        is_active,
        created_at,
        tenants(id, name, settings),
        teams(id, name)
      `)
      .eq('auth_user_id', user.id)
      .single()

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError)
      return null
    }

    return {
      user,
      employee,
      permissions: rolePermissions[employee.role as keyof typeof rolePermissions] || []
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// 로그아웃
export async function signOut() {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // 클라이언트 사이드 정리
    if (typeof window !== 'undefined') {
      window.location.href = authConfig.redirectUrls.signOut
    }
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// 이메일 OTP 로그인
export async function signInWithEmail(email: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // 기존 사용자만 로그인 허용
        emailRedirectTo: `${window.location.origin}/auth/confirm`
      }
    })
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Email OTP sign in error:', error)
    throw error
  }
}

// Google OAuth 로그인
export async function signInWithGoogle() {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
    
    if (error) throw error
  } catch (error) {
    console.error('Google OAuth sign in error:', error)
    throw error
  }
}

// Microsoft OAuth 로그인  
export async function signInWithMicrosoft() {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
        scopes: 'email profile'
      }
    })
    
    if (error) throw error
  } catch (error) {
    console.error('Microsoft OAuth sign in error:', error)
    throw error
  }
}

// OTP 확인
export async function verifyOtp(email: string, token: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('OTP verification error:', error)
    throw error
  }
}

// 사용자 초대 (관리자용)
export async function inviteUser(email: string, role: string, teamId: string, tenantId: string) {
  const supabase = createClient()
  
  try {
    // 1. 사용자 초대
    const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
    if (inviteError) throw inviteError
    
    // 2. 직원 레코드 생성
    const { error: employeeError } = await supabase
      .from('employees')
      .insert({
        auth_user_id: authData.user?.id,
        email,
        role,
        team_id: teamId,
        tenant_id: tenantId,
        is_active: true,
        created_at: new Date().toISOString()
      })
    
    if (employeeError) throw employeeError
    
    return { success: true, user: authData.user }
  } catch (error) {
    console.error('User invitation error:', error)
    throw error
  }
}