import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  WorkPatternPreference,
  checkPatternCompatibility 
} from '@/lib/scheduler/work-pattern-types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { employee_id1, employee_id2, team_id } = body

    if (team_id) {
      // Check compatibility for entire team
      const { data: teamPatterns, error } = await supabase
        .from('work_pattern_preferences')
        .select(`
          *,
          employees!inner(id, name, team_id)
        `)
        .eq('employees.team_id', team_id)

      if (error) throw error

      if (!teamPatterns || teamPatterns.length < 2) {
        return NextResponse.json({
          message: 'Not enough team members with work patterns to check compatibility',
          team_size: teamPatterns?.length || 0
        })
      }

      // Calculate pairwise compatibility matrix
      const compatibilityMatrix: Array<{
        employee1: { id: string; name: string }
        employee2: { id: string; name: string }
        compatibility: ReturnType<typeof checkPatternCompatibility>
      }> = []

      for (let i = 0; i < teamPatterns.length; i++) {
        for (let j = i + 1; j < teamPatterns.length; j++) {
          const pattern1 = teamPatterns[i]
          const pattern2 = teamPatterns[j]
          
          const compatibility = checkPatternCompatibility(pattern1, pattern2)
          
          compatibilityMatrix.push({
            employee1: {
              id: pattern1.employees.id,
              name: pattern1.employees.name
            },
            employee2: {
              id: pattern2.employees.id,
              name: pattern2.employees.name
            },
            compatibility
          })
        }
      }

      // Calculate team statistics
      const compatiblePairs = compatibilityMatrix.filter(c => c.compatibility.compatible).length
      const totalPairs = compatibilityMatrix.length
      const avgScore = compatibilityMatrix.reduce((sum, c) => sum + c.compatibility.score, 0) / totalPairs

      return NextResponse.json({
        team_compatibility: {
          compatible_pairs: compatiblePairs,
          total_pairs: totalPairs,
          compatibility_rate: (compatiblePairs / totalPairs) * 100,
          average_score: Math.round(avgScore),
          team_size: teamPatterns.length
        },
        pairwise_analysis: compatibilityMatrix.map(c => ({
          ...c,
          compatibility: {
            ...c.compatibility,
            score: Math.round(c.compatibility.score)
          }
        })),
        recommendations: avgScore < 60 ? [
          'Consider adjusting work patterns for better team compatibility',
          'Focus on aligning rest preferences and work intensities',
          'Review shift type preferences to minimize conflicts'
        ] : [
          'Team has good work pattern compatibility',
          'Current patterns should support effective scheduling',
          'Monitor for any emerging conflicts as patterns evolve'
        ]
      })
    }

    if (employee_id1 && employee_id2) {
      // Check compatibility between two specific employees
      const { data: patterns, error } = await supabase
        .from('work_pattern_preferences')
        .select(`
          *,
          employees(id, name)
        `)
        .in('employee_id', [employee_id1, employee_id2])

      if (error) throw error

      if (!patterns || patterns.length !== 2) {
        return NextResponse.json({
          error: 'Both employees must have work patterns configured'
        }, { status: 400 })
      }

      const pattern1 = patterns.find(p => p.employee_id === employee_id1)
      const pattern2 = patterns.find(p => p.employee_id === employee_id2)

      if (!pattern1 || !pattern2) {
        return NextResponse.json({
          error: 'Could not find patterns for both employees'
        }, { status: 400 })
      }

      const compatibility = checkPatternCompatibility(pattern1, pattern2)

      return NextResponse.json({
        employee1: {
          id: pattern1.employees.id,
          name: pattern1.employees.name,
          pattern: pattern1.pattern_type
        },
        employee2: {
          id: pattern2.employees.id,
          name: pattern2.employees.name,
          pattern: pattern2.pattern_type
        },
        compatibility: {
          ...compatibility,
          score: Math.round(compatibility.score)
        },
        detailed_analysis: {
          work_pattern_similarity: Math.abs(
            pattern1.preferred_consecutive_work_days - pattern2.preferred_consecutive_work_days
          ) <= 1,
          rest_pattern_alignment: pattern1.rest_preference === pattern2.rest_preference,
          intensity_match: pattern1.work_intensity === pattern2.work_intensity,
          weekend_preference_match: pattern1.prefer_weekend_off === pattern2.prefer_weekend_off
        },
        recommendations: compatibility.compatible ? [
          'These employees have compatible work patterns',
          'They can work well together in scheduling rotations',
          'Consider pairing them for shift coverage'
        ] : [
          'Work patterns may conflict in scheduling',
          'Consider adjusting preferences for better compatibility',
          'Monitor for scheduling conflicts between these employees'
        ]
      })
    }

    return NextResponse.json({
      error: 'Either provide two employee IDs or a team ID'
    }, { status: 400 })

  } catch (error) {
    console.error('Error checking pattern compatibility:', error)
    return NextResponse.json({ 
      error: 'Failed to check pattern compatibility' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({
        message: 'Provide teamId parameter for team compatibility overview',
        example: '/api/patterns/compatibility?teamId=team-uuid'
      })
    }

    const supabase = await createClient()

    // Get team patterns summary
    const { data: teamPatterns, error } = await supabase
      .from('work_pattern_preferences')
      .select(`
        pattern_type,
        work_intensity,
        rest_preference,
        employees!inner(id, name, team_id)
      `)
      .eq('employees.team_id', teamId)

    if (error) throw error

    // Pattern distribution analysis
    const patternDistribution: Record<string, number> = {}
    const intensityDistribution: Record<string, number> = {}
    const restDistribution: Record<string, number> = {}

    teamPatterns?.forEach(pattern => {
      patternDistribution[pattern.pattern_type] = (patternDistribution[pattern.pattern_type] || 0) + 1
      intensityDistribution[pattern.work_intensity] = (intensityDistribution[pattern.work_intensity] || 0) + 1
      restDistribution[pattern.rest_preference] = (restDistribution[pattern.rest_preference] || 0) + 1
    })

    return NextResponse.json({
      team_overview: {
        total_members: teamPatterns?.length || 0,
        patterns_configured: teamPatterns?.length || 0,
        pattern_distribution: patternDistribution,
        intensity_distribution: intensityDistribution,
        rest_preference_distribution: restDistribution
      },
      diversity_score: {
        pattern_diversity: Object.keys(patternDistribution).length,
        intensity_diversity: Object.keys(intensityDistribution).length,
        rest_diversity: Object.keys(restDistribution).length
      },
      team_members: teamPatterns?.map(pattern => ({
        id: pattern.employees.id,
        name: pattern.employees.name,
        pattern_type: pattern.pattern_type,
        work_intensity: pattern.work_intensity,
        rest_preference: pattern.rest_preference
      })) || []
    })

  } catch (error) {
    console.error('Error fetching team compatibility overview:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch team compatibility overview' 
    }, { status: 500 })
  }
}