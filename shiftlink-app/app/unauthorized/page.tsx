import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldOff, Home } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldOff className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">접근 권한이 없습니다</CardTitle>
          <CardDescription>
            이 페이지에 접근할 수 있는 권한이 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            이 페이지는 관리자 또는 매니저 권한이 필요합니다.
            접근 권한이 필요하신 경우 시스템 관리자에게 문의하세요.
          </p>
          
          <div className="pt-4">
            <Link href="/dashboard">
              <Button className="w-full">
                <Home className="mr-2 h-4 w-4" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}