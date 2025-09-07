'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar, Ticket, AlertCircle, Building2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()

  const [inviteCode, setInviteCode] = useState('')
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!inviteCode) {
        setError('초대 코드를 입력해주세요.')
        return
      }

      const res = await fetch(`/api/auth/validate-invite-code?code=${encodeURIComponent(inviteCode)}`)
      const data = await res.json()

      if (!res.ok || !data.valid) {
        setError(data.error || '유효하지 않은 초대 코드입니다.')
        return
      }

      // Go to details page with tenant context
      const q = new URLSearchParams({
        tenant_id: data.tenant_id,
        tenant_name: data.tenant_name,
        code: inviteCode.toUpperCase(),
      })
      router.push(`/auth/signup/details?${q.toString()}`)
    } catch (err) {
      console.error('Invite validation error:', err)
      setError('초대 코드 검증 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 rounded-2xl p-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ShiftLink</h1>
            <p className="text-gray-600 mt-2">조직 초대 확인</p>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">초대 코드 입력</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNext} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="inviteCode">초대 코드</Label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="8자리 초대 코드"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase())
                      setTenantName(null)
                    }}
                    className="pl-10 uppercase"
                    required
                    disabled={isLoading}
                    maxLength={8}
                  />
                </div>
                {tenantName && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Building2 className="h-4 w-4" /> {tenantName}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  '다음'
                )}
              </Button>
            </form>

            <div className="text-center pt-6 border-t mt-6">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium underline">
                  로그인
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>ShiftLink © 2024. 모든 권리 보유.</p>
        </div>
      </div>
    </div>
  )
}
