// Supabase 인증 설정
import { createClient } from '@/lib/supabase/client'
import { getCachedAuth, setCachedAuth, clearCachedAuth } from '@/lib/auth/auth-cache'

export const authConfig = {
  // 이메일 OTP 설정
  email: {
    enabled: true,
    magicLink: true,
    otpLength: 6,
    otpExpirationTime: 300, // 5분
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
    signOut: '/login',
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
  // 먼저 캐시 확인
  const cached = getCachedAuth()
  if (cached && cached.user && cached.session) {
    // 캐시된 세션이 유효한지 확인
    const now = new Date().getTime()
    const expires = new Date(cached.session.expires_at || 0).getTime()
    if (expires > now) {
      return cached
    }
  }

  const supabase = createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      clearCachedAuth()
      return null
    }

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
      clearCachedAuth()
      return null
    }

    const result = {
      user,
      employee,
      permissions: rolePermissions[employee.role as keyof typeof rolePermissions] || []
    }

    // 캐시 업데이트
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setCachedAuth({
        user,
        session,
        employee: {
          userId: employee.email,
          email: employee.email,
          role: employee.role
        }
      })
    }

    return result
  } catch (error) {
    console.error('Auth error:', error)
    clearCachedAuth()
    return null
  }
}

// 로그아웃
export async function signOut() {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // 캐시 삭제
    clearCachedAuth()
    
    // 클라이언트 사이드 정리
    if (typeof window !== 'undefined') {
      window.location.href = authConfig.redirectUrls.signOut
    }
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// 이메일 OTP 로그인 (사용하지 않음)
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

// 이메일/비밀번호 로그인
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient()
  
  try {
    // employees 테이블에서 정보 확인
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('role, is_active, auth_user_id')
      .eq('email', email)
      .single()

    if (employeeError) {
      console.error('Employee lookup error:', employeeError)
      // 직원 정보가 없어도 로그인 시도 (Auth 사용자만 있는 경우)
    }

    if (employee && !employee.is_active) {
      return { success: false, error: '계정이 비활성화되었습니다. 관리자에게 문의하세요.' }
    }

    // Supabase Auth로 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: '이메일 또는 비밀번호가 잘못되었습니다.' }
      }
      return { success: false, error: error.message }
    }

    // 로그인 성공 - 캐시에 저장
    if (data.user && data.session) {
      setCachedAuth({
        user: data.user,
        session: data.session,
        employee: {
          userId: email,
          email: email,
          role: employee?.role || 'employee'
        }
      })
    }

    return { success: true, data }
  } catch (error) {
    console.error('Password sign in error:', error)
    return { success: false, error: '로그인 중 오류가 발생했습니다.' }
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