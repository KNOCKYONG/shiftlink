import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  
  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
  }

  try {
    // Get hierarchy configuration
    const { data: hierarchy, error: hierarchyError } = await supabase
      .from('organization_hierarchy')
      .select('*')
      .eq('team_id', teamId)
      .order('level', { ascending: true })

    if (hierarchyError) throw hierarchyError

    // Get employee distribution
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('level')
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (employeesError) throw employeesError

    // Calculate distribution
    const distribution: Record<number, number> = {}
    employees?.forEach(emp => {
      const level = emp.level || 3
      distribution[level] = (distribution[level] || 0) + 1
    })

    return NextResponse.json({
      hierarchy,
      distribution,
      totalEmployees: employees?.length || 0
    })
  } catch (error) {
    console.error('Error fetching hierarchy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization hierarchy' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { teamId, tenantId, levels } = body

    if (!teamId || !tenantId || !levels) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Delete existing hierarchy for this team
    const { error: deleteError } = await supabase
      .from('organization_hierarchy')
      .delete()
      .eq('team_id', teamId)

    if (deleteError) throw deleteError

    // Insert new hierarchy levels
    const hierarchyData = levels.map((level: any) => ({
      tenant_id: tenantId,
      team_id: teamId,
      level: level.level,
      role_name: level.role_name,
      min_required: level.min_required,
      priority_on_conflict: level.priority_on_conflict
    }))

    const { data, error: insertError } = await supabase
      .from('organization_hierarchy')
      .insert(hierarchyData)
      .select()

    if (insertError) throw insertError

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating hierarchy:', error)
    return NextResponse.json(
      { error: 'Failed to update organization hierarchy' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { levelId, updates } = body

    if (!levelId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('organization_hierarchy')
      .update(updates)
      .eq('id', levelId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating hierarchy level:', error)
    return NextResponse.json(
      { error: 'Failed to update hierarchy level' },
      { status: 500 }
    )
  }
}