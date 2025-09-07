import { requireManagerOrAdmin } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import { ScheduleGenerationPage } from './schedule-generation-page'
import { redirect } from 'next/navigation'

export default async function GenerateSchedulePage() {
  const user = await requireManagerOrAdmin()
  const supabase = await createClient()

  // 팀 목록 조회 - admin은 모든 팀 조회
  let teamsQuery = supabase
    .from('teams')
    .select(`
      id,
      name,
      employees(count)
    `)
  
  // admin이 아닌 경우에만 tenant_id 필터 적용
  if (user.role !== 'admin') {
    teamsQuery = teamsQuery.eq('tenant_id', user.tenantId)
  }
  
  const { data: teams, error: teamsError } = await teamsQuery

  if (teamsError) {
    console.error('Teams fetch error:', teamsError)
    redirect('/dashboard?error=teams_fetch_failed')
  }

  // 사업장 목록 조회 - admin은 모든 사업장 조회
  let sitesQuery = supabase
    .from('sites')
    .select('id, name')
  
  // admin이 아닌 경우에만 tenant_id 필터 적용
  if (user.role !== 'admin') {
    sitesQuery = sitesQuery.eq('tenant_id', user.tenantId)
  }
  
  const { data: sites, error: sitesError } = await sitesQuery

  if (sitesError) {
    console.error('Sites fetch error:', sitesError)
    redirect('/dashboard?error=sites_fetch_failed')
  }

  // 팀별 직원 수 계산
  const teamsWithCount = teams?.map(team => ({
    id: team.id,
    name: team.name,
    employee_count: team.employees?.[0]?.count || 0
  })) || []

  return (
    <ScheduleGenerationPage
      user={user}
      teams={teamsWithCount}
      sites={sites || []}
    />
  )
}