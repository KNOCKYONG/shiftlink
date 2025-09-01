'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Mail,
  MessageSquare,
  Calendar,
  Share2,
  FileText,
  Table,
  CalendarDays,
  Download,
  Copy,
  ExternalLink,
  Users,
  Send,
  Loader2
} from 'lucide-react'

const emailFormSchema = z.object({
  recipients: z.string().min(1, '수신자 이메일을 입력해주세요'),
  includesPDF: z.boolean().default(true),
  includesCSV: z.boolean().default(true),
  includesICS: z.boolean().default(true),
  message: z.string().optional()
})

interface ScheduleShareDialogProps {
  scheduleId: string
  teamName: string
  month: Date
  trigger?: React.ReactNode
}

export function ScheduleShareDialog({
  scheduleId,
  teamName,
  month,
  trigger
}: ScheduleShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      recipients: '',
      includesPDF: true,
      includesCSV: true,
      includesICS: true,
      message: ''
    }
  })
  
  const onEmailSubmit = async (values: z.infer<typeof emailFormSchema>) => {
    setIsLoading(true)
    try {
      const recipients = values.recipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)
      
      const response = await fetch('/api/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          recipients,
          includesPDF: values.includesPDF,
          includesCSV: values.includesCSV,
          includesICS: values.includesICS,
          month: month.toISOString()
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send email')
      }
      
      toast.success('이메일 발송 완료', {
        description: `${recipients.length}명에게 근무표를 발송했습니다.`
      })
      
      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error('발송 실패', {
        description: '이메일 발송 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDownloadPDF = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/export/pdf`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schedule_${teamName}_${month.getFullYear()}-${month.getMonth() + 1}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF 다운로드 완료', {
        description: '근무표 PDF 파일이 다운로드되었습니다.'
      })
    } catch (error) {
      toast.error('다운로드 실패', {
        description: 'PDF 생성 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDownloadCSV = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/export/csv`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schedule_${teamName}_${month.getFullYear()}-${month.getMonth() + 1}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('CSV 다운로드 완료', {
        description: '근무표 CSV 파일이 다운로드되었습니다.'
      })
    } catch (error) {
      toast.error('다운로드 실패', {
        description: 'CSV 생성 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const generateCalendarUrl = async () => {
    // In production, this would generate a unique token for the user
    const token = 'demo-token-' + Math.random().toString(36).substr(2, 9)
    const baseUrl = window.location.origin
    const url = `${baseUrl}/api/ical/${token}`
    setCalendarUrl(url)
    return url
  }
  
  const copyCalendarUrl = async () => {
    if (!calendarUrl) {
      const url = await generateCalendarUrl()
      await navigator.clipboard.writeText(url)
    } else {
      await navigator.clipboard.writeText(calendarUrl)
    }
    
    toast.success('링크 복사 완료', {
      description: '캘린더 구독 링크가 클립보드에 복사되었습니다.'
    })
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            공유
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>근무표 공유</DialogTitle>
          <DialogDescription>
            {teamName} - {month.getFullYear()}년 {month.getMonth() + 1}월 근무표를 공유합니다
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="email" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              이메일
            </TabsTrigger>
            <TabsTrigger value="kakao">
              <MessageSquare className="h-4 w-4 mr-2" />
              카카오톡
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              캘린더
            </TabsTrigger>
            <TabsTrigger value="download">
              <Download className="h-4 w-4 mr-2" />
              다운로드
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="recipients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>수신자 이메일</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email1@example.com, email2@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        여러 명에게 보내실 경우 쉼표(,)로 구분해주세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <div className="text-sm font-medium">첨부 파일</div>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="includesPDF"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="font-normal">
                              PDF 파일 (인쇄용)
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="includesCSV"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="flex items-center space-x-2">
                            <Table className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="font-normal">
                              CSV 파일 (엑셀용)
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="includesICS"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="font-normal">
                              ICS 파일 (캘린더용)
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  이메일 발송
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="kakao" className="mt-6">
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                카카오톡 알림톡으로 근무표를 발송합니다
              </p>
              <Badge variant="secondary" className="mb-6">
                비즈메시지 API 연동 필요
              </Badge>
              <Button disabled className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                카카오톡 발송 (준비중)
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">캘린더 구독</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  아래 링크를 복사하여 캘린더 앱에서 구독하면 실시간으로 근무표가 동기화됩니다.
                </p>
                <div className="flex space-x-2">
                  <Input
                    readOnly
                    value={calendarUrl || '링크 생성 버튼을 눌러주세요'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={copyCalendarUrl}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium">캘린더 앱에서 바로 열기</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Google Calendar
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Outlook
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Apple Calendar
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    네이버 캘린더
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="download" className="mt-6">
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDownloadPDF}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                PDF 다운로드
                <span className="ml-auto text-muted-foreground text-sm">
                  인쇄 및 보관용
                </span>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDownloadCSV}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Table className="h-4 w-4 mr-2" />
                )}
                CSV 다운로드
                <span className="ml-auto text-muted-foreground text-sm">
                  엑셀 편집용
                </span>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-2" />
                )}
                ICS 다운로드
                <span className="ml-auto text-muted-foreground text-sm">
                  캘린더 가져오기용
                </span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}