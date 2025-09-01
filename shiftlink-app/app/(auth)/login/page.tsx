'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  signInWithEmail, 
  signInWithGoogle, 
  signInWithMicrosoft,
  getCurrentUser 
} from '@/lib/auth/auth-config'
import { 
  Mail, 
  Chrome, 
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // URL 파라미터에서 에러 메시지 처리
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages = {
        employee_not_found: '직원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.',
        account_inactive: '계정이 비활성화되었습니다. 관리자에게 문의하세요.',
        auth_check_failed: '인증 확인 중 오류가 발생했습니다. 다시 로그인해 주세요.',
        session_expired: '세션이 만료되었습니다. 다시 로그인해 주세요.'
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await signInWithEmail(email)
      setOtpSent(true)
      setSuccess('인증 이메일을 발송했습니다. 이메일을 확인해 주세요.')
    } catch (err: any) {
      setError(
        err.message === 'User not found' 
          ? '등록되지 않은 이메일입니다. 관리자에게 문의하세요.'
          : '이메일 발송에 실패했습니다. 다시 시도해 주세요.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (err: any) {
      setError('Google 로그인에 실패했습니다. 다시 시도해 주세요.')
      setLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true)
      await signInWithMicrosoft()
    } catch (err: any) {
      setError('Microsoft 로그인에 실패했습니다. 다시 시도해 주세요.')
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
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-sm text-gray-600">안전성</div>
          </div>
        </div>

        {/* 로그인 카드 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">로그인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 에러/성공 메시지 */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {!otpSent ? (
              <>
                {/* 이메일 로그인 */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">회사 이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        발송 중...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        이메일로 로그인
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">또는</span>
                  </div>
                </div>

                {/* OAuth 로그인 */}
                <div className="space-y-3">
                  <Button
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full h-11"
                    disabled={loading}
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google로 계속하기
                  </Button>

                  <Button
                    onClick={handleMicrosoftLogin}
                    variant="outline"
                    className="w-full h-11"
                    disabled={loading}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Microsoft로 계속하기
                  </Button>
                </div>
              </>
            ) : (
              /* OTP 발송 완료 상태 */
              <div className="text-center space-y-4">
                <div className="bg-blue-50 rounded-lg p-6">
                  <Mail className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">
                    이메일을 확인하세요
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-medium">{email}</span><br />
                    위 이메일 주소로 로그인 링크를 발송했습니다.
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• 이메일이 도착하지 않으면 스팸함을 확인해 주세요</p>
                    <p>• 링크는 5분간 유효합니다</p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setOtpSent(false)
                    setSuccess('')
                    setEmail('')
                  }}
                  variant="outline"
                  className="w-full"
                >
                  다른 이메일로 시도하기
                </Button>
              </div>
            )}

            {/* 도움말 */}
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>계정이 없으신가요?</p>
              <p>병원 관리자에게 초대를 요청하세요.</p>
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