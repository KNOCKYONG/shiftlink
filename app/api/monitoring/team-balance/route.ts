import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const teamId = searchParams.get('teamId')
    const reportDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const reportType = searchParams.get('type') || 'weekly'

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, role, team_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check permissions - only managers and admins can view team balance
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const targetTeamId = teamId || currentEmployee.team_id
    if (!targetTeamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Fetch team balance report
    const { data: balanceReport, error } = await supabase
      .from('team_balance_reports')
      .select('*')
      .eq('team_id', targetTeamId)
      .eq('report_date', reportDate)
      .eq('report_type', reportType)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no report exists, generate one from current data
    if (!balanceReport) {
      // Get team members
      const { data: teamMembers } = await supabase
        .from('employees')
        .select('id, name, employee_level, years_of_experience')
        .eq('team_id', targetTeamId)
        .eq('is_active', true)

      if (!teamMembers || teamMembers.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            total_members: 0,
            seniority_distribution: {
              junior: { count: 0, percentage: 0 },
              intermediate: { count: 0, percentage: 0 },
              senior: { count: 0, percentage: 0 },
              lead: { count: 0, percentage: 0 }
            },
            average_skill_level: 0,
            skill_diversity_index: 0,
            seniority_balance_score: 0,
            skill_balance_score: 0,
            shift_balance_score: 0,
            overall_balance_score: 0,
            shift_coverage: {
              day: { senior: 0, junior: 0 },
              evening: { senior: 0, junior: 0 },
              night: { senior: 0, junior: 0 }
            },
            imbalances: [],
            recommendations: []
          }
        })
      }

      // Calculate seniority distribution
      const seniorityDistribution = {
        junior: { count: 0, percentage: 0 },
        intermediate: { count: 0, percentage: 0 },
        senior: { count: 0, percentage: 0 },
        lead: { count: 0, percentage: 0 }
      }

      let totalSkillLevel = 0
      const skillLevels: number[] = []

      teamMembers.forEach(member => {
        const level = member.employee_level || 3
        const experience = member.years_of_experience || 0
        
        // Determine seniority based on level and experience
        let seniority: 'junior' | 'intermediate' | 'senior' | 'lead'
        if (level >= 5 || experience >= 10) {
          seniority = 'lead'
        } else if (level >= 4 || experience >= 5) {
          seniority = 'senior'
        } else if (level >= 2 || experience >= 2) {
          seniority = 'intermediate'
        } else {
          seniority = 'junior'
        }
        
        seniorityDistribution[seniority].count++
        totalSkillLevel += level
        skillLevels.push(level)
      })

      // Calculate percentages
      const totalMembers = teamMembers.length
      Object.keys(seniorityDistribution).forEach(key => {
        const seniority = key as keyof typeof seniorityDistribution
        seniorityDistribution[seniority].percentage = 
          (seniorityDistribution[seniority].count / totalMembers) * 100
      })

      // Calculate average skill level
      const averageSkillLevel = totalSkillLevel / totalMembers

      // Calculate skill diversity index (standard deviation)
      const variance = skillLevels.reduce((sum, level) => 
        sum + Math.pow(level - averageSkillLevel, 2), 0) / totalMembers
      const skillDiversityIndex = Math.sqrt(variance) * 3 // Scale to 0-10

      // Get shift coverage for the week
      const weekStart = new Date(reportDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const { data: assignments } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          employee:employee_id(id, employee_level, years_of_experience),
          schedule:schedule_id(schedule_date)
        `)
        .in('employee_id', teamMembers.map(m => m.id))
        .gte('schedule.schedule_date', weekStart.toISOString().split('T')[0])
        .lte('schedule.schedule_date', weekEnd.toISOString().split('T')[0])
        .eq('status', 'confirmed')

      // Analyze shift coverage
      const shiftCoverage = {
        day: { senior: 0, junior: 0 },
        evening: { senior: 0, junior: 0 },
        night: { senior: 0, junior: 0 }
      }

      assignments?.forEach(assignment => {
        const level = assignment.employee?.employee_level || 3
        const isSenior = level >= 4
        const shiftType = assignment.shift_type as 'day' | 'evening' | 'night'
        
        if (shiftType in shiftCoverage) {
          if (isSenior) {
            shiftCoverage[shiftType].senior++
          } else {
            shiftCoverage[shiftType].junior++
          }
        }
      })

      // Calculate balance scores
      const idealSeniorityRatio = 0.3 // 30% senior/lead
      const actualSeniorityRatio = 
        (seniorityDistribution.senior.count + seniorityDistribution.lead.count) / totalMembers
      const seniorityBalanceScore = 
        Math.max(0, 100 - Math.abs(idealSeniorityRatio - actualSeniorityRatio) * 200)

      const skillBalanceScore = 
        Math.min(100, (averageSkillLevel / 5) * 100 * (skillDiversityIndex / 5))

      // Check if all shifts have at least one senior
      const hasNightSenior = shiftCoverage.night.senior > 0
      const shiftBalanceScore = 
        hasNightSenior ? 80 : 40 + 
        (shiftCoverage.day.senior > 0 ? 10 : 0) +
        (shiftCoverage.evening.senior > 0 ? 10 : 0)

      const overallBalanceScore = 
        (seniorityBalanceScore * 0.3 + skillBalanceScore * 0.3 + shiftBalanceScore * 0.4)

      // Identify imbalances
      const imbalances = []
      const recommendations = []

      if (!hasNightSenior) {
        imbalances.push({
          type: 'shift_coverage',
          severity: 'high',
          description: '야간 근무에 시니어 직원이 배치되지 않음'
        })
        recommendations.push('야간 근무에 최소 1명의 시니어 직원 배치 필요')
      }

      if (seniorityDistribution.junior.percentage > 50) {
        imbalances.push({
          type: 'seniority',
          severity: 'medium',
          description: '주니어 직원 비율이 높음'
        })
        recommendations.push('신입 직원을 위한 멘토링 프로그램 강화 권장')
      }

      if (skillDiversityIndex < 2) {
        imbalances.push({
          type: 'skill_diversity',
          severity: 'low',
          description: '팀 내 숙련도 다양성이 낮음'
        })
        recommendations.push('다양한 경험 수준의 팀원 구성 권장')
      }

      return NextResponse.json({
        success: true,
        data: {
          total_members: totalMembers,
          seniority_distribution: seniorityDistribution,
          average_skill_level: parseFloat(averageSkillLevel.toFixed(1)),
          skill_diversity_index: parseFloat(skillDiversityIndex.toFixed(1)),
          seniority_balance_score: parseFloat(seniorityBalanceScore.toFixed(0)),
          skill_balance_score: parseFloat(skillBalanceScore.toFixed(0)),
          shift_balance_score: parseFloat(shiftBalanceScore.toFixed(0)),
          overall_balance_score: parseFloat(overallBalanceScore.toFixed(0)),
          shift_coverage: shiftCoverage,
          imbalances,
          recommendations
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: balanceReport
    })

  } catch (error) {
    console.error('Error fetching team balance:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch team balance data' 
    }, { status: 500 })
  }
}