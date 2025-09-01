import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: employee } = await supabase
      .from('employees')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Fetch active mentorship relationships with employee details
    const { data: relationships, error } = await supabase
      .from('mentorship_relationships')
      .select(`
        *,
        mentor:employees!mentor_id(id, name, level),
        mentee:employees!mentee_id(id, name, level)
      `)
      .eq('tenant_id', employee.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching relationships:', error)
      return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
    }

    // Calculate additional metrics for each relationship
    const enrichedRelationships = await Promise.all(
      (relationships || []).map(async (rel) => {
        // Calculate days active
        const startDate = new Date(rel.start_date)
        const endDate = rel.end_date ? new Date(rel.end_date) : new Date()
        const daysActive = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        // Get pairing success rate from schedule pairings
        const { data: pairings } = await supabase
          .from('mentorship_schedule_pairings')
          .select('is_paired')
          .eq('relationship_id', rel.id)

        const pairingSuccessRate = pairings && pairings.length > 0
          ? Math.round((pairings.filter(p => p.is_paired).length / pairings.length) * 100)
          : undefined

        return {
          ...rel,
          mentor_name: rel.mentor?.name,
          mentor_level: rel.mentor?.level,
          mentee_name: rel.mentee?.name,
          mentee_level: rel.mentee?.level,
          days_active: daysActive,
          pairing_success_rate: pairingSuccessRate
        }
      })
    )

    return NextResponse.json({ relationships: enrichedRelationships })
  } catch (error) {
    console.error('Error in GET /api/mentorship/relationships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant and check permissions
    const { data: employee } = await supabase
      .from('employees')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!employee || !['admin', 'manager'].includes(employee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      mentor_id,
      mentee_id,
      mentorship_type = 'onboarding',
      pairing_strength = 7,
      duration_days = 30,
      notes
    } = body

    // Validate mentor and mentee exist and are in same tenant
    const { data: mentor } = await supabase
      .from('employees')
      .select('id, level, tenant_id')
      .eq('id', mentor_id)
      .single()

    const { data: mentee } = await supabase
      .from('employees')
      .select('id, level, tenant_id')
      .eq('id', mentee_id)
      .single()

    if (!mentor || !mentee) {
      return NextResponse.json({ error: 'Mentor or mentee not found' }, { status: 404 })
    }

    if (mentor.tenant_id !== employee.tenant_id || mentee.tenant_id !== employee.tenant_id) {
      return NextResponse.json({ error: 'Mentor and mentee must be in same tenant' }, { status: 400 })
    }

    if (mentor.level <= mentee.level) {
      return NextResponse.json({ error: 'Mentor must have higher level than mentee' }, { status: 400 })
    }

    // Check if mentee already has an active mentorship
    const { data: existingMentorship } = await supabase
      .from('mentorship_relationships')
      .select('id')
      .eq('mentee_id', mentee_id)
      .eq('status', 'active')
      .single()

    if (existingMentorship) {
      return NextResponse.json({ error: 'Mentee already has an active mentor' }, { status: 400 })
    }

    // Check mentor's current mentee count
    const { data: mentorMentees } = await supabase
      .from('mentorship_relationships')
      .select('id')
      .eq('mentor_id', mentor_id)
      .eq('status', 'active')

    const { data: requirements } = await supabase
      .from('mentoring_requirements')
      .select('max_mentees_per_mentor')
      .eq('tenant_id', employee.tenant_id)
      .single()

    const maxMentees = requirements?.max_mentees_per_mentor || 3
    if (mentorMentees && mentorMentees.length >= maxMentees) {
      return NextResponse.json({ 
        error: `Mentor already has maximum number of mentees (${maxMentees})` 
      }, { status: 400 })
    }

    // Create the mentorship relationship
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + duration_days)

    const { data: newRelationship, error: createError } = await supabase
      .from('mentorship_relationships')
      .insert({
        mentor_id,
        mentee_id,
        tenant_id: employee.tenant_id,
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        mentorship_type,
        pairing_strength,
        notes,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating mentorship:', createError)
      return NextResponse.json({ error: 'Failed to create mentorship' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      relationship: newRelationship 
    })
  } catch (error) {
    console.error('Error in POST /api/mentorship/relationships:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}