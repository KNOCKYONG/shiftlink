'use client'

import { useState } from 'react'
import { updateProfile } from '@/lib/profile/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save, User } from 'lucide-react'

interface ProfileEditFormProps {
  employee: {
    name?: string
    email?: string
    phone?: string
    position?: string
    role?: string
    tenants?: { name: string }
  }
  onSuccess?: () => void
}

export function ProfileEditForm({ employee, onSuccess }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('email', formData.email)
    formDataObj.append('phone', formData.phone)
    formDataObj.append('position', formData.position)

    try {
      const result = await updateProfile(formDataObj)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('프로필이 성공적으로 업데이트되었습니다.')
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (error) {
      toast.error('프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'admin':
        return '관리자'
      case 'manager':
        return '매니저'
      case 'employee':
      default:
        return '직원'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="홍길동"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="example@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">직책</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="수간호사"
              />
            </div>

            <div className="space-y-2">
              <Label>역할</Label>
              <div className="flex items-center h-10 px-3 py-2 bg-gray-100 rounded-md">
                <span className="text-sm font-medium">{getRoleDisplay(employee?.role)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>소속</Label>
              <div className="flex items-center h-10 px-3 py-2 bg-gray-100 rounded-md">
                <span className="text-sm">{employee?.tenants?.name || '미지정'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  프로필 저장
                </>
              )}
            </Button>
          </div>
        </form>
  )
}