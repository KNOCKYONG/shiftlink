'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Copy, RefreshCw, Shield, Users, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function InviteCodePage() {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoadInviteCode()
  }, [])

  const checkUserAndLoadInviteCode = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('role, tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!employee) {
        toast.error('직원 정보를 찾을 수 없습니다.')
        return
      }

      setUserRole(employee.role)
      setTenantId(employee.tenant_id)

      // Check if user is admin or manager
      if (employee.role !== 'admin' && employee.role !== 'manager') {
        toast.error('접근 권한이 없습니다.')
        router.push('/dashboard')
        return
      }

      // Get tenant info with invite code
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, invite_code')
        .eq('id', employee.tenant_id)
        .single()

      if (tenant) {
        setTenantName(tenant.name)
        setInviteCode(tenant.invite_code)
      }
    } catch (error) {
      console.error('Error loading invite code:', error)
      toast.error('초대 코드를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      toast.success('초대 코드가 복사되었습니다.')
    }
  }

  const regenerateInviteCode = async () => {
    if (!tenantId) return
    
    setRegenerating(true)
    try {
      // Call the regenerate function
      const { data, error } = await supabase
        .rpc('regenerate_invite_code', { tenant_id: tenantId })

      if (error) throw error

      setInviteCode(data)
      toast.success('새로운 초대 코드가 생성되었습니다.')
    } catch (error) {
      console.error('Error regenerating invite code:', error)
      toast.error('초대 코드 재생성에 실패했습니다.')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            이 페이지에 접근할 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">초대 코드 관리</h1>
          <p className="text-muted-foreground mt-2">
            새로운 직원이 가입할 때 사용할 초대 코드를 관리합니다.
          </p>
        </div>

        {/* Invite Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {tenantName} 초대 코드
            </CardTitle>
            <CardDescription>
              이 코드를 새로운 직원에게 공유하여 조직에 가입할 수 있도록 하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteCode && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-3xl font-mono font-bold tracking-wider bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                      {inviteCode}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={copyInviteCode}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      복사
                    </Button>
                    {userRole === 'admin' && (
                      <Button
                        onClick={regenerateInviteCode}
                        variant="destructive"
                        disabled={regenerating}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                        재생성
                      </Button>
                    )}
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>초대 코드는 대소문자를 구분하지 않습니다.</li>
                      <li>각 조직마다 고유한 초대 코드를 가집니다.</li>
                      {userRole === 'admin' && (
                        <li>코드를 재생성하면 이전 코드는 사용할 수 없게 됩니다.</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>사용 방법</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>위의 초대 코드를 복사합니다.</li>
              <li>새로운 직원에게 초대 코드를 전달합니다.</li>
              <li>직원은 회원가입 시 초대 코드를 입력합니다.</li>
              <li>초대 코드가 확인되면 조직에 자동으로 연결됩니다.</li>
            </ol>
          </CardContent>
        </Card>

        {/* Security Notice for Admin */}
        {userRole === 'admin' && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>보안 주의사항:</strong> 초대 코드를 재생성하면 이전 코드로는 더 이상 가입할 수 없습니다. 
              재생성 후에는 반드시 새로운 코드를 필요한 직원들에게 공유해주세요.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}