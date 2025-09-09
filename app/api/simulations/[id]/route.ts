import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 시뮬레이션 조회
    const { data: simulation, error: simError } = await supabase
      .from('schedule_simulations')
      .select(`
        *,
        created_by:employees!created_by(name, position),
        approved_by:employees!approved_by(name, position)
      `)
      .eq('id', params.id)
      .single()

    if (simError || !simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
    }

    // 배정 조회
    const { data: assignments, error: assignError } = await supabase
      .from('simulation_assignments')
      .select(`
        *,
        employee:employees!employee_id(
          id,
          name,
          position,
          hierarchy_level,
          team:teams(name)
        )
      `)
      .eq('simulation_id', params.id)
      .order('date')
      .order('shift_type')

    if (assignError) {
      console.error('Error fetching assignments:', assignError)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    // 배정 데이터 포맷팅
    const formattedAssignments = (assignments || []).map(a => ({
      id: a.id,
      employee_id: a.employee_id,
      employee_name: a.employee?.name || '',
      date: a.date,
      shift_type: a.shift_type,
      hierarchy_level: a.hierarchy_level,
      is_supervisor: a.is_supervisor,
      is_modified: a.is_modified,
      modification_type: a.modification_type
    }))

    return NextResponse.json({
      simulation,
      assignments: formattedAssignments,
      metrics: simulation.metrics || {}
    })

  } catch (error) {
    console.error('Error in simulation GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assignments, metrics, changeHistory } = await request.json()

    // 시뮬레이션 업데이트
    const { error: updateError } = await supabase
      .from('schedule_simulations')
      .update({
        metrics,
        changes_count: changeHistory?.length || 0,
        changes_log: changeHistory || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating simulation:', updateError)
      return NextResponse.json({ error: 'Failed to update simulation' }, { status: 500 })
    }

    // 기존 배정 삭제
    const { error: deleteError } = await supabase
      .from('simulation_assignments')
      .delete()
      .eq('simulation_id', params.id)

    if (deleteError) {
      console.error('Error deleting assignments:', deleteError)
    }

    // 새 배정 삽입
    if (assignments && assignments.length > 0) {
      const assignmentsToInsert = assignments.map((a: any) => ({
        simulation_id: params.id,
        employee_id: a.employee_id,
        date: a.date,
        shift_type: a.shift_type,
        hierarchy_level: a.hierarchy_level,
        is_supervisor: a.is_supervisor,
        is_modified: a.is_modified,
        modification_type: a.modification_type,
        modified_by: user.id,
        modified_at: a.is_modified ? new Date().toISOString() : null
      }))

      const { error: insertError } = await supabase
        .from('simulation_assignments')
        .insert(assignmentsToInsert)

      if (insertError) {
        console.error('Error inserting assignments:', insertError)
        return NextResponse.json({ error: 'Failed to save assignments' }, { status: 500 })
      }
    }

    // 변경 이력 저장
    if (changeHistory && changeHistory.length > 0) {
      const latestChange = changeHistory[changeHistory.length - 1]
      
      const { error: historyError } = await supabase
        .from('simulation_change_history')
        .insert({
          simulation_id: params.id,
          change_type: latestChange.type || 'manual',
          changed_by: user.id,
          affected_assignments: assignments.filter((a: any) => a.is_modified).map((a: any) => a.id),
          change_details: latestChange,
          metrics_after: metrics
        })

      if (historyError) {
        console.error('Error saving change history:', historyError)
      }
    }

    return NextResponse.json({ message: 'Simulation updated successfully' })

  } catch (error) {
    console.error('Error in simulation PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 권한 확인
    const { data: employee } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!employee || !['admin', 'manager'].includes(employee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // 시뮬레이션 삭제 (CASCADE로 관련 데이터도 자동 삭제)
    const { error: deleteError } = await supabase
      .from('schedule_simulations')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting simulation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete simulation' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Simulation deleted successfully' })

  } catch (error) {
    console.error('Error in simulation DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}