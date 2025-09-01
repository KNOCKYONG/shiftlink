'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      try {
        // URL에서 인증 파라미터 확인
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth confirmation error:', error)
          setStatus('error')
          setMessage('인증 확인 중 오류가 발생했습니다.')
          return
        }

        if (data.session) {
          // 직원 정보 확인
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select(`
              id,
              name,
              email,
              role,
              is_active,
              tenant_id,
              tenants(name, is_active)
            `)
            .eq('auth_user_id', data.session.user.id)
            .single()

          if (employeeError || !employee) {
            console.error('Employee not found:', employeeError)
            setStatus('error')
            setMessage('직원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.')
            return
          }

          if (!employee.is_active || !employee.tenants?.is_active) {
            setStatus('error')
            setMessage('계정이 비활성화되었습니다. 관리자에게 문의하세요.')
            await supabase.auth.signOut()
            return
          }

          // 성공
          setStatus('success')
          setMessage(`${employee.name}님, 환영합니다!`)
          
          // 2초 후 대시보드로 리다이렉트
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('인증 세션을 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage('인증 처리 중 오류가 발생했습니다.')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고 */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 rounded-2xl p-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ShiftLink</h1>
        </div>

        {/* 상태 카드 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle>
              {status === 'loading' && '인증 확인 중'}
              {status === 'success' && '로그인 성공'}
              {status === 'error' && '로그인 실패'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">인증 정보를 확인하고 있습니다...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    {message}
                  </p>
                  <p className="text-gray-600">
                    잠시 후 대시보드로 이동합니다...
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                <Alert className="border-red-200 bg-red-50 text-left">
                  <AlertDescription className="text-red-800">
                    {message}
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/auth/login')}
                    className="w-full"
                  >
                    로그인 페이지로 돌아가기
                  </Button>
                  <p className="text-sm text-gray-500">
                    문제가 계속 발생하면 IT 관리자에게 문의하세요.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <ConfirmContent />
    </Suspense>
  )
}