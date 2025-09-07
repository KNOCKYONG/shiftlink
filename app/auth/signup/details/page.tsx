'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Building2, Mail, User, Lock, Phone, Calendar, AlertCircle, ChevronsUpDown, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

type Team = { id: string; name: string; site_id: string }
type Site = { id: string; name: string; teams?: Team[] }

export default function SignupDetailsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const tenantId = params.get('tenant_id') || ''
  const tenantName = params.get('tenant_name') || ''

  // account fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  // Role is fixed to employee at signup stage per requirements

  // employee fields
  const [phoneValue, setPhoneValue] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [siteId, setSiteId] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const [newTeamName, setNewTeamName] = useState('')

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentSiteTeams = useMemo(() => {
    return sites.find((s) => s.id === siteId)?.teams || []
  }, [sites, siteId])

  const allTeams = useMemo<Team[]>(() => {
    return sites.flatMap((s) => (s.teams || []).map(t => ({ ...t, site_id: t.site_id || s.id })))
  }, [sites])

  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/auth/tenant-structure?tenant_id=${tenantId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '조직 정보를 가져오지 못했습니다.')
        const fetchedSites: Site[] = data.sites || []
        setSites(fetchedSites)
        if (fetchedSites.length > 0) {
          setSiteId(fetchedSites[0].id)
          const firstTeams = fetchedSites[0].teams || []
          if (firstTeams.length > 0) setTeamId(firstTeams[0].id)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!tenantId) {
        setError('초대 코드 확인 단계가 누락되었습니다.')
        return
      }
      if (!email || !password || !name) {
        setError('이메일, 비밀번호, 이름을 입력해주세요.')
        return
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        return
      }
      if (password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.')
        return
      }

      // sign up auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'employee', tenant_id: tenantId },
        },
      })
      if (authError) {
        setError(authError.message)
        return
      }
      if (!authData.user) {
        setError('회원가입에 실패했습니다.')
        return
      }

      // call complete-signup to create employee
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: authData.user.id,
          email,
          name,
          // role is enforced as employee server-side
          tenantId,
          phone: phoneValue || null,
          hireDate: hireDate || null,
          teamId: newTeamName ? null : teamId || null,
          teamName: newTeamName || null,
          siteId: siteId || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setError(err.error || '직원 정보 생성에 실패했습니다.')
        return
      }

      alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.')
      router.push('/auth/login')
    } catch (e: any) {
      console.error(e)
      setError('회원가입 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center text-gray-600">잘못된 접근입니다. 초대 코드 확인 후 진행해주세요.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <Building2 className="h-5 w-5" />
            <span className="font-medium">{tenantName || '조직'}</span>
          </div>
          <h1 className="text-2xl font-bold">계정 및 직원 정보</h1>
          <p className="text-gray-600">계정 정보와 부서(팀) 정보를 입력해주세요.</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="email" type="email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="name" type="text" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="password" type="password" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="confirmPassword" type="password" className="pl-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                  </div>
                </div>
                {/* 역할은 직원 고정 (관리자 승격은 관리자 페이지에서 처리) */}
              </div>

              <div className="pt-2">
                <CardTitle className="text-base mb-3">직원 정보</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input id="phone" type="tel" className="pl-10" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hire">입사일</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input id="hire" type="date" className="pl-10" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>사이트</Label>
                    <Select value={siteId} onValueChange={(v) => { setSiteId(v); setTeamId('') }} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? '로딩 중...' : '사이트 선택'} />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>부서(팀)</Label>
                    <SearchableTeamSelect
                      value={teamId}
                      onChange={(v) => {
                        setTeamId(v)
                        setNewTeamName('')
                        const picked = allTeams.find(t => t.id === v)
                        if (picked) setSiteId(picked.site_id)
                      }}
                      options={allTeams.map(t => ({ value: t.id, label: t.name }))}
                      placeholder={loading ? '로딩 중...' : '팀 선택 또는 검색'}
                      disabled={loading}
                    />
                    <div className="text-xs text-gray-500">새 부서를 만들려면 아래 입력란을 사용하세요.</div>
                    <Input placeholder="새 부서(팀) 이름" value={newTeamName} onChange={(e) => { setNewTeamName(e.target.value); if (e.target.value) setTeamId('') }} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={submitting}>
                {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />회원가입 중...</>) : '회원가입'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Simple searchable select using Popover + Input + ScrollArea
function SearchableTeamSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedLabel = options.find(o => o.value === value)?.label
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedLabel || placeholder || '선택'}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          placeholder="검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
          autoFocus
        />
        <ScrollArea className="h-56 pr-2">
          <div className="space-y-1">
            {filtered.length === 0 && (
              <div className="text-sm text-gray-500 px-2 py-1">검색 결과가 없습니다.</div>
            )}
            {filtered.map(opt => (
              <Button
                key={opt.value}
                type="button"
                variant="ghost"
                className="w-full justify-between"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                <span className="truncate text-left">{opt.label}</span>
                {opt.value === value && <Check className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
