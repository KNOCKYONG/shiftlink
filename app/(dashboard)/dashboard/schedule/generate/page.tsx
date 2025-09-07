import { requireManagerOrAdmin } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import { ScheduleGenerationPage } from './schedule-generation-page'
import { redirect } from 'next/navigation'

export default async function GenerateSchedulePage() {
  const user = await requireManagerOrAdmin()
  const supabase = createClient()

  // 팀 목록 조회
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      employees(count)
    `)
    .eq('tenant_id', user.tenantId)
    .eq('is_active', true)

  if (teamsError) {
    console.error('Teams fetch error:', teamsError)
    redirect('/dashboard?error=teams_fetch_failed')
  }

  // 사업장 목록 조회
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, name')
    .eq('tenant_id', user.tenantId)
    .eq('is_active', true)

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