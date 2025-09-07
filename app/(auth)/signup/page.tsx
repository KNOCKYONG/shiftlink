'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Lock, User, AlertCircle, Calendar, Mail, Building } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [department, setDepartment] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setIsLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setIsLoading(false)
      return
    }

    try {
      // 1. Create auth user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            department
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('이미 등록된 이메일입니다.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('회원가입에 실패했습니다.')
        return
      }

      // 2. Create employee record via API
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authUserId: authData.user.id,
          email,
          name,
          role,
          department
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || '회원가입 처리 중 오류가 발생했습니다.')
        return
      }

      // Success - show success message and redirect
      alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
      router.push('/auth/login')
    } catch (err) {
      console.error('Signup error:', err)
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
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
            <p className="text-gray-600 mt-2">회원가입</p>
          </div>
        </div>

        {/* 회원가입 카드 */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">새 계정 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {/* 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="실명을 입력하세요"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {/* 역할 */}
              <div className="space-y-2">
                <Label htmlFor="role">역할 *</Label>
                <Select value={role} onValueChange={(value) => setRole(value as 'admin' | 'employee')}>
                  <SelectTrigger>
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">직원</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 부서 */}
              <div className="space-y-2">
                <Label htmlFor="department">부서</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="department"
                    type="text"
                    placeholder="소속 부서 (선택사항)"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {/* 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </div>
              
              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </div>
              
              {/* 회원가입 버튼 */}
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    회원가입 중...
                  </>
                ) : (
                  '회원가입'
                )}
              </Button>
            </form>
            
            {/* 로그인 링크 */}
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

        {/* 푸터 */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>ShiftLink © 2024. 모든 권리 보유.</p>
        </div>
      </div>
    </div>
  )
}