'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  signInWithPassword, 
  getCurrentUser 
} from '@/lib/auth/auth-config'
import { 
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // URL 파라미터에서 에러 메시지 처리
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    if (errorParam) {
      const errorMessages = {
        employee_not_found: '직원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.',
        account_inactive: '계정이 비활성화되었습니다. 관리자에게 문의하세요.',
        auth_check_failed: '인증 확인 중 오류가 발생했습니다. 다시 로그인해 주세요.',
        session_expired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
        auth_callback_error: messageParam ? `이메일 확인 중 오류: ${messageParam}` : '이메일 확인 중 오류가 발생했습니다. 다시 시도해 주세요.'
      }
      setError(errorMessages[errorParam as keyof typeof errorMessages] || '로그인 중 오류가 발생했습니다.')
    }
  }, [searchParams])

  // 이미 로그인된 사용자 체크
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        router.push(redirectTo)
      }
    }
    checkAuth()
  }, [router, searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || loading) return

    setLoading(true)
    setError('')

    try {
      const result = await signInWithPassword(email, password)
      
      if (result.success) {
        // 로그인 성공 - 대시보드로 이동
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        router.push(redirectTo)
      } else {
        setError(result.error || '로그인에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고 및 제목 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 rounded-2xl p-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ShiftLink</h1>
            <p className="text-gray-600 mt-2">3교대 소통형 스케줄링 플랫폼</p>
          </div>
        </div>

        {/* 특징 소개 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="bg-green-100 rounded-full p-3 w-fit mx-auto">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">공정성</div>
          </div>
          <div className="space-y-2">
            <div className="bg-blue-100 rounded-full p-3 w-fit mx-auto">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">소통형</div>
          </div>
          <div className="space-y-2">
            <div className="bg-purple-100 rounded-full p-3 w-fit mx-auto">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-sm text-gray-600">스마트</div>
          </div>
        </div>

        {/* 로그인 카드 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">로그인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 에러 메시지 */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* 로그인 폼 */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>

            {/* 회원가입 링크 */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                아직 계정이 없으신가요?{' '}
                <Link 
                  href="/signup" 
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  회원가입
                </Link>
              </p>
            </div>

            {/* 도움말 */}
            <div className="text-center text-sm text-gray-500 space-y-1">
              <p>관리자(admin)와 직원(employee) 모두 로그인 가능합니다.</p>
              <p>문제가 있으시면 관리자에게 문의하세요.</p>
            </div>
          </CardContent>
        </Card>

        {/* 푸터 */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>ShiftLink © 2024. 모든 권리 보유.</p>
          <p>안전하고 공정한 3교대 스케줄링</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  )
}