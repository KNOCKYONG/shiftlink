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
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Get all relationships for stats calculation
    const { data: relationships } = await supabase
      .from('mentorship_relationships')
      .select('*')
      .eq('tenant_id', employee.tenant_id)

    // Calculate statistics
    const activeRelationships = relationships?.filter(r => r.status === 'active') || []
    const completedRelationships = relationships?.filter(r => r.status === 'completed') || []
    
    // Calculate average duration
    let totalDuration = 0
    let countWithDuration = 0
    
    relationships?.forEach(rel => {
      if (rel.start_date) {
        const start = new Date(rel.start_date)
        const end = rel.end_date ? new Date(rel.end_date) : new Date()
        const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        totalDuration += duration
        countWithDuration++
      }
    })
    
    const averageDuration = countWithDuration > 0 
      ? Math.round(totalDuration / countWithDuration)
      : 0

    // Calculate success rate from completed relationships
    const { data: completedMetrics } = await supabase
      .from('mentorship_metrics')
      .select('pairing_success_rate')
      .in('relationship_id', completedRelationships.map(r => r.id))

    const successRates = completedMetrics?.map(m => m.pairing_success_rate).filter(r => r !== null) || []
    const averageSuccessRate = successRates.length > 0
      ? Math.round(successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length)
      : 0

    // Count unique mentors and mentees
    const uniqueMentors = new Set(relationships?.map(r => r.mentor_id))
    const uniqueMentees = new Set(relationships?.map(r => r.mentee_id))

    const stats = {
      active_relationships: activeRelationships.length,
      completed_relationships: completedRelationships.length,
      average_duration_days: averageDuration,
      success_rate: averageSuccessRate,
      mentors_count: uniqueMentors.size,
      mentees_count: uniqueMentees.size
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error in GET /api/mentorship/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}