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
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, email, level, role, hire_date, employee_code, avatar_url')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('level', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ employees: data })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { updates } = body // Array of { id, level } objects

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      )
    }

    // Update each employee's level
    const results = []
    for (const update of updates) {
      const { data, error } = await supabase
        .from('employees')
        .update({ level: update.level })
        .eq('id', update.id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating employee ${update.id}:`, error)
        results.push({ id: update.id, success: false, error: error.message })
      } else {
        results.push({ id: update.id, success: true, data })
      }
    }

    const allSuccessful = results.every(r => r.success)

    if (allSuccessful) {
      return NextResponse.json({ success: true, results })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          results,
          message: 'Some updates failed'
        },
        { status: 207 } // Multi-status
      )
    }
  } catch (error) {
    console.error('Error updating employee levels:', error)
    return NextResponse.json(
      { error: 'Failed to update employee levels' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { employeeId, level } = body

    if (!employeeId || level === undefined) {
      return NextResponse.json(
        { error: 'Employee ID and level are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ level })
      .eq('id', employeeId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating employee level:', error)
    return NextResponse.json(
      { error: 'Failed to update employee level' },
      { status: 500 }
    )
  }
}