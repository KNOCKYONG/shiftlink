import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 세션 새로 고침
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  
  // 인증이 필요 없는 경로들
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
    '/unauthorized',
    '/api/auth/complete-signup'
  ]

  // API 경로는 별도 처리
  if (pathname.startsWith('/api/')) {
    // API 경로에서도 인증 확인 (auth 관련 제외)
    if (!pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/test-db')) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    return response
  }

  // 정적 파일들은 통과
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon') ||
      pathname.includes('.')) {
    return response
  }

  // 인증된 사용자가 인증 페이지에 접근하는 경우 대시보드로 리다이렉트
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 인증되지 않은 사용자가 보호된 페이지에 접근하는 경우
  if (!user && !publicPaths.includes(pathname) && !pathname.startsWith('/auth/')) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 대시보드 접근 시 직원 정보 확인 및 권한 검사
  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/(dashboard)'))) {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          id, 
          role, 
          tenant_id, 
          team_id,
          name, 
          email, 
          is_active,
          tenants(id, name, is_active)
        `)
        .eq('auth_user_id', user.id)
        .single()

      // 직원 정보가 없거나 조회 실패
      if (employeeError || !employee) {
        console.error('Employee not found:', employeeError)
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login?error=employee_not_found', request.url))
      }

      // 직원 또는 테넌트가 비활성화된 경우
      if (!employee.is_active || !employee.tenants?.is_active) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login?error=account_inactive', request.url))
      }

      // 역할별 접근 제어
      const roleBasedAccess = {
        admin: [
          '/dashboard/admin',
          '/dashboard/settings',
          '/dashboard/employees/manage',
          '/dashboard/tenants',
          '/dashboard/schedules/manage',
          '/dashboard/reports/all',
          '/dashboard/audit'
        ],
        manager: [
          '/dashboard/schedules/manage', 
          '/dashboard/employees/view',
          '/dashboard/reports/team',
          '/dashboard/leaves/approve',
          '/dashboard/swaps/approve'
        ],
        employee: [
          '/dashboard',
          '/dashboard/schedule',
          '/dashboard/leaves',
          '/dashboard/swaps', 
          '/dashboard/profile'
        ]
      }

      const userRole = employee.role as keyof typeof roleBasedAccess
      const allowedPaths = roleBasedAccess[userRole] || roleBasedAccess.employee

      // 권한 확인
      const hasAccess = allowedPaths.some(allowedPath => 
        pathname === allowedPath || pathname.startsWith(allowedPath + '/')
      )

      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }

      // 응답 헤더에 사용자 정보 추가 (선택사항)
      response.headers.set('x-user-role', employee.role)
      response.headers.set('x-tenant-id', employee.tenant_id)

    } catch (error) {
      console.error('Middleware employee check error:', error)
      // 에러 발생 시 로그인으로 리다이렉트
      return NextResponse.redirect(new URL('/auth/login?error=auth_check_failed', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}