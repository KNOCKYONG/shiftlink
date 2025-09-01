'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Share2,
  Copy,
  Download,
  Calendar,
  Clock,
  Users,
  Shield,
  Eye,
  Link,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  QrCode
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  scheduleId: string
  scheduleName: string
}

interface ShareRecord {
  id: string
  share_token: string
  share_type: string
  expires_at: string
  require_password: boolean
  include_personal_info: boolean
  access_count: number
  is_active: boolean
  created_at: string
}

export function ShareDialog({ isOpen, onClose, scheduleId, scheduleName }: ShareDialogProps) {
  const [shareType, setShareType] = useState<'view' | 'download' | 'subscribe'>('view')
  const [expiresInHours, setExpiresInHours] = useState(168) // 7일
  const [requirePassword, setRequirePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [includePersonalInfo, setIncludePersonalInfo] = useState(false)
  const [description, setDescription] = useState('')
  
  const [shareUrl, setShareUrl] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [existingShares, setExistingShares] = useState<ShareRecord[]>([])
  const [loadingShares, setLoadingShares] = useState(true)

  // 기존 공유 목록 불러오기
  useEffect(() => {
    if (isOpen) {
      fetchExistingShares()
    }
  }, [isOpen, scheduleId])

  const fetchExistingShares = async () => {
    try {
      setLoadingShares(true)
      const response = await fetch(`/api/schedules/${scheduleId}/share`)
      
      if (response.ok) {
        const data = await response.json()
        setExistingShares(data.shares || [])
      }
    } catch (err) {
      console.error('Failed to fetch existing shares:', err)
    } finally {
      setLoadingShares(false)
    }
  }

  const handleCreateShare = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/schedules/${scheduleId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          share_type: shareType,
          expires_in_hours: expiresInHours,
          require_password: requirePassword,
          password: requirePassword ? password : null,
          include_personal_info: includePersonalInfo,
          description
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create share')
      }

      const data = await response.json()
      setShareUrl(data.share_url)
      setShareToken(data.share_token)
      setSuccess(true)
      
      // 기존 공유 목록 새로고침
      fetchExistingShares()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const deactivateShare = async (token: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/share?token=${token}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchExistingShares()
      }
    } catch (err) {
      console.error('Failed to deactivate share:', err)
    }
  }

  const getShareTypeIcon = (type: string) => {
    switch (type) {
      case 'view': return <Eye className="h-4 w-4" />
      case 'download': return <Download className="h-4 w-4" />
      case 'subscribe': return <Calendar className="h-4 w-4" />
      default: return <Share2 className="h-4 w-4" />
    }
  }

  const getShareTypeName = (type: string) => {
    switch (type) {
      case 'view': return '조회만'
      case 'download': return '다운로드 허용'
      case 'subscribe': return '캘린더 구독'
      default: return type
    }
  }

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            스케줄 공유: {scheduleName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">새 공유 만들기</TabsTrigger>
            <TabsTrigger value="existing">기존 공유 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && shareUrl && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>공유 링크가 생성되었습니다!</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={shareUrl} 
                        readOnly 
                        className="text-sm" 
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(shareUrl)}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(shareUrl + '?format=csv')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV 다운로드 링크 복사
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(shareUrl + '?format=ical')}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        iCal 링크 복사
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="share-type">공유 유형</Label>
                  <Select value={shareType} onValueChange={(value) => setShareType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          조회만 가능
                        </div>
                      </SelectItem>
                      <SelectItem value="download">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          다운로드 허용
                        </div>
                      </SelectItem>
                      <SelectItem value="subscribe">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          캘린더 구독
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-hours">만료 시간</Label>
                  <Select value={expiresInHours.toString()} onValueChange={(value) => setExpiresInHours(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24시간</SelectItem>
                      <SelectItem value="72">3일</SelectItem>
                      <SelectItem value="168">1주일</SelectItem>
                      <SelectItem value="720">1개월</SelectItem>
                      <SelectItem value="8760">1년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="require-password">비밀번호 설정</Label>
                      <p className="text-sm text-muted-foreground">
                        링크에 접근할 때 비밀번호를 요구합니다
                      </p>
                    </div>
                    <Switch
                      id="require-password"
                      checked={requirePassword}
                      onCheckedChange={setRequirePassword}
                    />
                  </div>

                  {requirePassword && (
                    <div className="space-y-2">
                      <Label htmlFor="password">비밀번호</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호를 입력하세요"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="include-personal">개인정보 포함</Label>
                      <p className="text-sm text-muted-foreground">
                        직원의 전화번호, 이메일 정보를 포함합니다
                      </p>
                    </div>
                    <Switch
                      id="include-personal"
                      checked={includePersonalInfo}
                      onCheckedChange={setIncludePersonalInfo}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명 (선택사항)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="이 공유에 대한 설명을 입력하세요"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button onClick={handleCreateShare} disabled={loading || (requirePassword && !password)}>
                  {loading ? '생성 중...' : '공유 링크 생성'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">기존 공유 목록</h3>
                <Button size="sm" variant="outline" onClick={fetchExistingShares}>
                  새로고침
                </Button>
              </div>

              {loadingShares ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : existingShares.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  생성된 공유가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {existingShares.map((share) => (
                    <div key={share.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getShareTypeIcon(share.share_type)}
                          <span className="font-medium">
                            {getShareTypeName(share.share_type)}
                          </span>
                          <div className="flex gap-1">
                            {share.require_password && (
                              <Badge variant="outline">
                                <Shield className="h-3 w-3 mr-1" />
                                비밀번호
                              </Badge>
                            )}
                            {share.include_personal_info && (
                              <Badge variant="outline">
                                <Users className="h-3 w-3 mr-1" />
                                개인정보
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isExpired(share.expires_at) ? "destructive" : share.is_active ? "default" : "secondary"}>
                            {isExpired(share.expires_at) ? "만료됨" : share.is_active ? "활성" : "비활성"}
                          </Badge>
                          {share.is_active && !isExpired(share.expires_at) && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deactivateShare(share.share_token)}
                            >
                              비활성화
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">생성일:</span> {formatExpiryDate(share.created_at)}
                        </div>
                        <div>
                          <span className="font-medium">만료일:</span> {formatExpiryDate(share.expires_at)}
                        </div>
                        <div>
                          <span className="font-medium">접근 횟수:</span> {share.access_count}회
                        </div>
                      </div>

                      {share.is_active && !isExpired(share.expires_at) && (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/schedule/${share.share_token}`}
                            readOnly 
                            className="text-sm"
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/schedule/${share.share_token}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}