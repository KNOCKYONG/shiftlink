import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  recommendWorkPattern,
  WORK_PATTERN_TEMPLATES 
} from '@/lib/scheduler/work-pattern-types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { employee_id, lookback_days = 90 } = body

    if (!employee_id) {
      return NextResponse.json({ 
        error: 'Employee ID is required' 
      }, { status: 400 })
    }

    // Get employee's work history
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookback_days)

    const { data: workHistory, error: historyError } = await supabase
      .from('schedule_assignments')
      .select(`
        date,
        start_time,
        end_time,
        shift_templates(type)
      `)
      .eq('employee_id', employee_id)
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (historyError) {
      console.error('Error fetching work history:', historyError)
      throw historyError
    }

    // Transform work history for pattern analysis
    const transformedHistory = (workHistory || []).map(assignment => ({
      date: assignment.date,
      shift_type: assignment.shift_templates?.type || 'day'
    }))

    // Get employee profile for personal preferences (if exists)
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .single()

    // Mock personal preferences - in real app, this would come from a profile/survey
    const personalPreferences = {
      energy_level: 'morning', // morning, evening, flexible
      stress_management: 'frequent_breaks', // frequent_breaks, deep_rest, balanced
      family_commitments: 'moderate', // high, moderate, low
      health_considerations: 'none' // none, sleep_disorders, physical_limitations
    }

    // Get pattern recommendation
    const recommendation = recommendWorkPattern(
      transformedHistory,
      personalPreferences
    )

    // Get template details for the recommended pattern
    const recommendedTemplate = WORK_PATTERN_TEMPLATES[recommendation.recommendedPattern]

    // Calculate compatibility with existing team patterns if requested
    const teamCompatibility = null // Could be implemented to check team patterns

    return NextResponse.json({
      recommendation: {
        pattern_type: recommendation.recommendedPattern,
        confidence: recommendation.confidence,
        reasons: recommendation.reasons,
        template: recommendedTemplate
      },
      analysis: {
        work_history_days: transformedHistory.length,
        lookback_period: lookback_days,
        personal_factors: personalPreferences,
        team_compatibility: teamCompatibility
      },
      alternatives: Object.entries(WORK_PATTERN_TEMPLATES).map(([key, template]) => ({
        pattern_type: key,
        name: template.name,
        description: template.description,
        is_recommended: key === recommendation.recommendedPattern
      }))
    })

  } catch (error) {
    console.error('Error generating pattern recommendation:', error)
    return NextResponse.json({ 
      error: 'Failed to generate pattern recommendation' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ 
        error: 'Employee ID is required' 
      }, { status: 400 })
    }

    // Return available templates and basic recommendation without history analysis
    const templates = Object.entries(WORK_PATTERN_TEMPLATES).map(([key, template]) => ({
      pattern_type: key,
      name: template.name,
      description: template.description,
      details: {
        work_days: template.preferred_consecutive_work_days,
        rest_days: template.preferred_consecutive_rest_days,
        max_consecutive: template.max_consecutive_work_days,
        intensity: template.work_intensity,
        rest_style: template.rest_preference
      }
    }))

    return NextResponse.json({
      message: 'To get personalized recommendations, use POST with work history analysis',
      available_patterns: templates,
      default_recommendation: 'balanced'
    })

  } catch (error) {
    console.error('Error fetching pattern templates:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch pattern templates' 
    }, { status: 500 })
  }
}