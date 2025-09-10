'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertCircle, Check, Ticket } from 'lucide-react'
import WorkPatternPreferences from '@/components/settings/work-pattern-preferences'
import DefaultRequests from '@/components/settings/default-requests'
import { EmployeePreferenceSettings } from '@/components/preferences/employee-preference-settings'
import OrganizationHierarchy from '@/components/settings/organization-hierarchy'
import EmployeeLevelAssignment from '@/components/team/employee-level-assignment'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Profile state
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [role, setRole] = useState('')
  const [currentWorkPattern, setCurrentWorkPattern] = useState<any>(null)
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (employee) {
      setEmployeeId(employee.id)
      setTeamId(employee.team_id)
      setTenantId(employee.tenant_id)
      setName(employee.name)
      setEmail(employee.email)
      setPhone(employee.phone || '')
      setEmployeeCode(employee.employee_code || '')
      setRole(employee.role)

      // Load work pattern preferences
      loadWorkPattern(employee.id)
    }
  }

  const loadWorkPattern = async (empId: string) => {
    try {
      const response = await fetch(`/api/patterns?employeeId=${empId}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentWorkPattern(data.pattern)
      }
    } catch (error) {
      console.error('Failed to load work pattern:', error)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('사용자를 찾을 수 없습니다.')

      // Update employee record
      const { error } = await supabase
        .from('employees')
        .update({
          name,
          phone,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: '프로필이 업데이트되었습니다.' })
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '프로필 업데이트에 실패했습니다.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoadingPassword(true)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' })
      setIsLoadingPassword(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' })
      setIsLoadingPassword(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' })
    } finally {
      setIsLoadingPassword(false)
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      case 'employee': return '직원'
      default: return role
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">설정</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          프로필 정보와 계정 설정을 관리하세요.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-full min-w-max">
            <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 sm:px-3">프로필</TabsTrigger>
            <TabsTrigger value="password" className="text-xs sm:text-sm px-2 sm:px-3">비밀번호</TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs sm:text-sm px-2 sm:px-3">근무 선호도</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs sm:text-sm px-2 sm:px-3">요청사항</TabsTrigger>
            <TabsTrigger value="hierarchy" disabled={role !== 'admin' && role !== 'manager'} className="text-xs sm:text-sm px-2 sm:px-3">
              조직 구조
            </TabsTrigger>
            <TabsTrigger value="levels" disabled={role !== 'admin' && role !== 'manager'} className="text-xs sm:text-sm px-2 sm:px-3">
              레벨 관리
            </TabsTrigger>
            <TabsTrigger value="invite" disabled={role !== 'admin' && role !== 'manager'} className="text-xs sm:text-sm px-2 sm:px-3">
              초대 코드
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>
                기본 프로필 정보를 업데이트하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-1234-5678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">사원번호</Label>
                    <Input
                      id="employeeCode"
                      value={employeeCode}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">역할</Label>
                    <Input
                      id="role"
                      value={getRoleName(role)}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      변경사항 저장
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>
                계정 보안을 위해 주기적으로 비밀번호를 변경하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordMessage && (
                  <Alert variant={passwordMessage.type === 'error' ? 'destructive' : 'default'}>
                    {passwordMessage.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    <AlertDescription>{passwordMessage.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">새 비밀번호</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoadingPassword} className="w-full sm:w-auto">
                  {isLoadingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      변경 중...
                    </>
                  ) : (
                    '비밀번호 변경'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          {employeeId ? (
            <div className="space-y-6">
              {/* Lifestyle & Fairness Preferences */}
              <EmployeePreferenceSettings />
              
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">근무 패턴 설정</span>
                </div>
              </div>
              
              {/* Work Pattern Preferences */}
              <WorkPatternPreferences 
                employeeId={employeeId}
                currentPattern={currentWorkPattern}
                onSave={(pattern) => {
                  setCurrentWorkPattern(pattern)
                  setMessage({ type: 'success', text: '근무 패턴이 저장되었습니다.' })
                }}
              />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>근무 선호도</CardTitle>
                <CardDescription>
                  선호하는 근무 패턴을 설정하세요. 스케줄 생성 시 최대한 반영됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">사용자 정보를 불러오는 중...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {employeeId ? (
            <DefaultRequests employeeId={employeeId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>사전 요청사항</CardTitle>
                <CardDescription>
                  고정 근무, 휴가 등을 미리 등록하여 스케줄 생성을 편리하게 하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">사용자 정보를 불러오는 중...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hierarchy">
          {teamId && tenantId ? (
            <OrganizationHierarchy teamId={teamId} tenantId={tenantId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>조직 구조</CardTitle>
                <CardDescription>
                  팀의 계층 구조와 레벨별 최소 필요 인원을 설정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">팀 정보를 불러오는 중...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="levels">
          {teamId ? (
            <EmployeeLevelAssignment teamId={teamId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>레벨 관리</CardTitle>
                <CardDescription>
                  팀 구성원의 계층 레벨을 할당하고 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">팀 정보를 불러오는 중...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invite">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                초대 코드 관리
              </CardTitle>
              <CardDescription>
                새로운 직원이 가입할 때 사용할 초대 코드를 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  초대 코드를 사용하여 새로운 직원을 조직에 초대할 수 있습니다.
                </p>
                <Button 
                  onClick={() => router.push('/dashboard/settings/invite-code')}
                  className="w-full sm:w-auto"
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  초대 코드 관리 페이지로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}