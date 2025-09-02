import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 일단 모든 요청을 통과시켜서 배포가 되도록 함
  return NextResponse.next()
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