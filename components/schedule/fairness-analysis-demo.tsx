'use client'

import React from 'react'
import { FairnessAnalysisDashboard } from './fairness-analysis-dashboard'

// 🧪 Demo data that would typically come from the API after schedule generation
export function FairnessAnalysisDemo() {
  const mockFairnessMetrics = {
    overallGini: 0.28, // 좋은 공정성 수준
    targetGini: 0.30,  // 목표 Gini 계수
    fairnessScore: 87, // 100점 만점
    workloadVariance: 0.25,
    shiftDistributionBalance: 84,
    
    employeeFairness: [
      {
        id: '1',
        name: '김철수',
        team: 'A팀',
        totalShifts: 22,
        dayShifts: 8,
        eveningShifts: 7,
        nightShifts: 7,
        weekendShifts: 6,
        totalHours: 176,
        overtimeHours: 8
      },
      {
        id: '2',
        name: '박영희',
        team: 'A팀',
        totalShifts: 20,
        dayShifts: 7,
        eveningShifts: 6,
        nightShifts: 7,
        weekendShifts: 5,
        totalHours: 160,
        overtimeHours: 4
      },
      {
        id: '3',
        name: '이민호',
        team: 'B팀',
        totalShifts: 24,
        dayShifts: 9,
        eveningShifts: 8,
        nightShifts: 7,
        weekendShifts: 7,
        totalHours: 192,
        overtimeHours: 12
      },
      {
        id: '4',
        name: '정수진',
        team: 'B팀',
        totalShifts: 18,
        dayShifts: 6,
        eveningShifts: 6,
        nightShifts: 6,
        weekendShifts: 4,
        totalHours: 144,
        overtimeHours: 2
      },
      {
        id: '5',
        name: '최동욱',
        team: 'C팀',
        totalShifts: 21,
        dayShifts: 8,
        eveningShifts: 7,
        nightShifts: 6,
        weekendShifts: 5,
        totalHours: 168,
        overtimeHours: 6
      },
      {
        id: '6',
        name: '김지은',
        team: 'C팀',
        totalShifts: 19,
        dayShifts: 7,
        eveningShifts: 6,
        nightShifts: 6,
        weekendShifts: 4,
        totalHours: 152,
        overtimeHours: 3
      },
      {
        id: '7',
        name: '조현우',
        team: 'A팀',
        totalShifts: 23,
        dayShifts: 8,
        eveningShifts: 8,
        nightShifts: 7,
        weekendShifts: 6,
        totalHours: 184,
        overtimeHours: 10
      },
      {
        id: '8',
        name: '윤서진',
        team: 'B팀',
        totalShifts: 17,
        dayShifts: 5,
        eveningShifts: 6,
        nightShifts: 6,
        weekendShifts: 3,
        totalHours: 136,
        overtimeHours: 1
      }
    ],

    teamFairness: [
      {
        teamName: 'A팀',
        memberCount: 3,
        avgShiftsPerMember: 21.7,
        avgHoursPerMember: 173.3,
        fairnessScore: 89,
        giniCoefficient: 0.24 // 가장 공정한 팀
      },
      {
        teamName: 'C팀',
        memberCount: 2,
        avgShiftsPerMember: 20.0,
        avgHoursPerMember: 160.0,
        fairnessScore: 85,
        giniCoefficient: 0.28
      },
      {
        teamName: 'B팀',
        memberCount: 3,
        avgShiftsPerMember: 19.7,
        avgHoursPerMember: 157.3,
        fairnessScore: 78,
        giniCoefficient: 0.35 // 개선이 필요한 팀
      }
    ],

    recommendations: [
      {
        type: 'warning' as const,
        title: 'B팀 내부 업무량 불균형 해소',
        description: 'B팀의 Gini 계수가 0.35로 다른 팀 대비 높습니다. 이민호(192시간)와 윤서진(136시간)의 56시간 차이를 줄이기 위해 일부 시프트 재배정을 권장합니다.',
        impact: 'high' as const
      },
      {
        type: 'suggestion' as const,
        title: '야간 근무 분배 최적화',
        description: '현재 야간 근무가 특정 직원에게 집중되는 경향이 있습니다. 로테이션 시스템을 도입하여 야간 근무 부담을 더 균등하게 분산시킬 수 있습니다.',
        impact: 'medium' as const
      },
      {
        type: 'suggestion' as const,
        title: '주말 근무 공정성 개선',
        description: '주말 근무 배정에서 3-7회의 차이가 발생하고 있습니다. 주말 근무 선호도를 고려한 공정한 로테이션 시스템 적용을 고려해보세요.',
        impact: 'medium' as const
      },
      {
        type: 'critical' as const,
        title: '초과 근무 시간 집중 현상',
        description: '이민호(12시간)와 조현우(10시간)에게 초과 근무가 집중되어 있습니다. 근로기준법 준수를 위해 초과 근무 시간을 다른 직원에게 재분배하는 것을 권장합니다.',
        impact: 'high' as const
      },
      {
        type: 'suggestion' as const,
        title: '팀 간 업무량 균형 조정',
        description: 'A팀(평균 173.3시간)과 B팀(평균 157.3시간) 간 16시간 차이가 있습니다. 팀 간 일부 시프트 교환을 통해 전체적인 균형을 개선할 수 있습니다.',
        impact: 'low' as const
      }
    ]
  }

  return (
    <div className="p-6">
      <FairnessAnalysisDashboard
        metrics={mockFairnessMetrics}
        scheduleId="schedule_2024_03_001"
        scheduleName="2024년 3월 간호팀 스케줄"
        generatedAt="2024-03-01 14:30"
      />
    </div>
  )
}