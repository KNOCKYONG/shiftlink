import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SimulationClient from './simulation-client'

export default async function SimulationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // 직원 정보 가져오기
  const { data: employee } = await supabase
    .from('employees')
    .select('*, tenants(name), teams(name)')
    .eq('auth_user_id', user.id)
    .single()

  // 관리자 권한 체크
  if (!employee || (employee.role !== 'admin' && employee.role !== 'manager')) {
    redirect('/dashboard')
  }

  // 팀 목록 가져오기
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('tenant_id', employee.tenant_id)
    .order('name')

  // 전체 직원 목록 가져오기
  const { data: employees } = await supabase
    .from('employees')
    .select('*, teams(name)')
    .eq('tenant_id', employee.tenant_id)
    .order('name')

  console.log('Simulation page data:', {
    employee: employee?.name,
    teams: teams?.length,
    teamsData: teams,
    employees: employees?.length,
    employeesData: employees?.map(emp => ({ name: emp.name, team_id: emp.team_id, teams: emp.teams }))
  })

  // shift templates 가져오기
  const { data: shiftTemplates } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('tenant_id', employee.tenant_id)
    .order('name')

  return (
    <SimulationClient 
      employee={employee}
      teams={teams || []}
      employees={employees || []}
      shiftTemplates={shiftTemplates || []}
    />
  )
}