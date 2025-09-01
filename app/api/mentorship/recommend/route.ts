import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const menteeId = searchParams.get('mentee_id')

    if (!menteeId) {
      return NextResponse.json({ error: 'Mentee ID is required' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mentee details
    const { data: mentee } = await supabase
      .from('employees')
      .select('*, work_pattern_preferences(*)')
      .eq('id', menteeId)
      .single()

    if (!mentee) {
      return NextResponse.json({ error: 'Mentee not found' }, { status: 404 })
    }

    // Get mentoring requirements
    const { data: requirements } = await supabase
      .from('mentoring_requirements')
      .select('*')
      .eq('tenant_id', mentee.tenant_id)
      .single()

    const minLevelDiff = requirements?.min_level_difference || 1
    const maxMenteesPerMentor = requirements?.max_mentees_per_mentor || 3

    // Get potential mentors
    const { data: potentialMentors } = await supabase
      .from('employees')
      .select(`
        *,
        work_pattern_preferences(*),
        mentorships:mentorship_relationships!mentor_id(
          id,
          status
        )
      `)
      .eq('tenant_id', mentee.tenant_id)
      .gte('level', mentee.level + minLevelDiff)
      .eq('is_active', true)

    if (!potentialMentors || potentialMentors.length === 0) {
      return NextResponse.json({ recommendations: [] })
    }

    // Calculate compatibility scores
    const recommendations = await Promise.all(
      potentialMentors.map(async (mentor) => {
        // Count current active mentees
        const activeMenteeships = mentor.mentorships?.filter(
          (m: any) => m.status === 'active'
        ) || []
        const currentMentees = activeMenteeships.length

        // Skip if mentor already has max mentees
        if (currentMentees >= maxMenteesPerMentor) {
          return null
        }

        // Calculate compatibility score
        let score = 50 // Base score
        const reasons: string[] = []

        // Level difference scoring
        const levelDiff = mentor.level - mentee.level
        if (levelDiff === 1 || levelDiff === 2) {
          score += 20
          reasons.push('적절한 레벨 차이')
        } else if (levelDiff === 3) {
          score += 10
          reasons.push('적정 레벨 차이')
        }

        // Work pattern compatibility
        if (mentor.work_pattern_preferences && mentee.work_pattern_preferences) {
          const mentorPattern = mentor.work_pattern_preferences[0]
          const menteePattern = mentee.work_pattern_preferences[0]
          
          if (mentorPattern && menteePattern) {
            if (mentorPattern.pattern_type === menteePattern.pattern_type) {
              score += 15
              reasons.push('근무 패턴 일치')
            }
            
            // Shift preference alignment
            const shiftAlignment = calculateShiftAlignment(
              mentorPattern.shift_type_preferences,
              menteePattern.shift_type_preferences
            )
            score += shiftAlignment * 10
            if (shiftAlignment > 0.7) {
              reasons.push('시간대 선호 일치')
            }
          }
        }

        // Current mentee load
        if (currentMentees === 0) {
          score += 10
          reasons.push('현재 멘티 없음')
        } else if (currentMentees < maxMenteesPerMentor / 2) {
          score += 5
          reasons.push(`여유 있는 멘토링 가능 (현재 ${currentMentees}명)`)
        }

        // Same team bonus
        if (mentor.team_id === mentee.team_id) {
          score += 10
          reasons.push('같은 팀')
        }

        // Get historical mentorship success rate
        const { data: historicalMetrics } = await supabase
          .from('mentorship_metrics')
          .select('pairing_success_rate')
          .eq('relationship_id', activeMenteeships.map((m: any) => m.id))

        if (historicalMetrics && historicalMetrics.length > 0) {
          const avgSuccess = historicalMetrics.reduce((sum, m) => sum + (m.pairing_success_rate || 0), 0) / historicalMetrics.length
          if (avgSuccess > 80) {
            score += 10
            reasons.push('높은 멘토링 성공률')
          }
        }

        return {
          mentor_id: mentor.id,
          mentor_name: mentor.name,
          mentor_level: mentor.level,
          compatibility_score: Math.min(100, score),
          current_mentees: currentMentees,
          reasons
        }
      })
    )

    // Filter out nulls and sort by score
    const validRecommendations = recommendations
      .filter(r => r !== null)
      .sort((a, b) => b!.compatibility_score - a!.compatibility_score)
      .slice(0, 5)

    return NextResponse.json({ recommendations: validRecommendations })
  } catch (error) {
    console.error('Error in GET /api/mentorship/recommend:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateShiftAlignment(
  mentorPrefs: any,
  menteePrefs: any
): number {
  if (!mentorPrefs || !menteePrefs) return 0.5

  const shifts = ['day', 'evening', 'night']
  let totalDiff = 0
  let count = 0

  shifts.forEach(shift => {
    if (mentorPrefs[shift] !== undefined && menteePrefs[shift] !== undefined) {
      const diff = Math.abs(mentorPrefs[shift] - menteePrefs[shift])
      totalDiff += (10 - diff) / 10
      count++
    }
  })

  return count > 0 ? totalDiff / count : 0.5
}