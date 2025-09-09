'use client'

import React from 'react'
import { PatternSafetyReport } from './pattern-safety-report'

// 🚨 Demo data showcasing dangerous Korean healthcare shift patterns
export function PatternSafetyDemo() {
  const mockPatternSafetyMetrics = {
    overallSafetyScore: 72, // 주의 수준
    complianceRate: 78.5,
    totalDangerousPatterns: 12,
    
    patternsByType: {
      day_night_off: 3,      // 데이나오 패턴 (가장 위험)
      consecutive_nights: 2,  // 연속 야간근무
      excessive_changes: 4,   // 과도한 교대 변경
      insufficient_rest: 2,   // 휴식 시간 부족
      weekend_overload: 1,    // 주말 과로
      overtime_fatigue: 0     // 과로 위험 없음
    },

    employeeSafety: [
      {
        employeeId: '1',
        employeeName: '김철수',
        team: 'A팀',
        overallSafetyScore: 65, // 고위험
        totalPatterns: 3,
        criticalPatterns: 1,
        highRiskPatterns: 2,
        riskFactors: ['데이나오 패턴', '과도한 교대 변경', '휴식 부족'],
        recommendations: ['즉시 스케줄 조정 필요', '충분한 휴식 시간 보장'],
        fatigueIndex: 8.2,
        recoveryTime: 16
      },
      {
        employeeId: '2',
        employeeName: '박영희',
        team: 'A팀',
        overallSafetyScore: 88,
        totalPatterns: 0,
        criticalPatterns: 0,
        highRiskPatterns: 0,
        riskFactors: [],
        recommendations: ['현재 안전한 스케줄 유지'],
        fatigueIndex: 3.1,
        recoveryTime: 8
      },
      {
        employeeId: '3',
        employeeName: '이민호',
        team: 'B팀',
        overallSafetyScore: 58, // 고위험
        totalPatterns: 4,
        criticalPatterns: 2,
        highRiskPatterns: 2,
        riskFactors: ['연속 야간근무', '데이나오 패턴', '과도한 시프트 변경'],
        recommendations: ['즉시 스케줄 재조정', '야간 근무 분산', '의료진 추가 검토'],
        fatigueIndex: 9.1,
        recoveryTime: 24
      },
      {
        employeeId: '4',
        employeeName: '정수진',
        team: 'B팀',
        overallSafetyScore: 76,
        totalPatterns: 1,
        criticalPatterns: 0,
        highRiskPatterns: 1,
        riskFactors: ['과도한 교대 변경'],
        recommendations: ['시프트 변경 최소화'],
        fatigueIndex: 5.3,
        recoveryTime: 10
      },
      {
        employeeId: '5',
        employeeName: '최동욱',
        team: 'C팀',
        overallSafetyScore: 82,
        totalPatterns: 1,
        criticalPatterns: 0,
        highRiskPatterns: 0,
        riskFactors: ['주말 연속 근무'],
        recommendations: ['주말 휴식 확보'],
        fatigueIndex: 4.2,
        recoveryTime: 8
      },
      {
        employeeId: '6',
        employeeName: '김지은',
        team: 'C팀',
        overallSafetyScore: 67, // 고위험
        totalPatterns: 2,
        criticalPatterns: 0,
        highRiskPatterns: 2,
        riskFactors: ['과도한 시프트 변경', '휴식 시간 부족'],
        recommendations: ['안정적인 시프트 패턴 적용'],
        fatigueIndex: 7.8,
        recoveryTime: 14
      },
      {
        employeeId: '7',
        employeeName: '조현우',
        team: 'A팀',
        overallSafetyScore: 91,
        totalPatterns: 0,
        criticalPatterns: 0,
        highRiskPatterns: 0,
        riskFactors: [],
        recommendations: ['현재 안전한 패턴 지속'],
        fatigueIndex: 2.5,
        recoveryTime: 8
      },
      {
        employeeId: '8',
        employeeName: '윤서진',
        team: 'B팀',
        overallSafetyScore: 69, // 고위험
        totalPatterns: 1,
        criticalPatterns: 0,
        highRiskPatterns: 1,
        riskFactors: ['데이나오 패턴'],
        recommendations: ['데이→나이트 직접 연결 금지'],
        fatigueIndex: 6.9,
        recoveryTime: 12
      }
    ],

    teamSafety: [
      {
        teamName: 'A팀',
        memberCount: 3,
        averageSafetyScore: 81.3,
        totalDangerousPatterns: 3,
        criticalPatterns: 1,
        highRiskPatterns: 2,
        complianceRate: 85.2,
        riskLevel: 'caution' as const
      },
      {
        teamName: 'C팀',
        memberCount: 2,
        averageSafetyScore: 74.5,
        totalDangerousPatterns: 3,
        criticalPatterns: 0,
        highRiskPatterns: 2,
        complianceRate: 78.9,
        riskLevel: 'caution' as const
      },
      {
        teamName: 'B팀',
        memberCount: 3,
        averageSafetyScore: 67.7,
        totalDangerousPatterns: 6,
        criticalPatterns: 2,
        highRiskPatterns: 3,
        complianceRate: 71.3,
        riskLevel: 'dangerous' as const
      }
    ],

    dangerousPatterns: [
      {
        id: '1',
        employeeId: '1',
        employeeName: '김철수',
        team: 'A팀',
        patternType: 'day_night_off' as const,
        patternName: '위험한 데이나오 패턴',
        description: '데이 근무 후 바로 나이트 근무로 배정되어 극심한 피로와 안전사고 위험이 높습니다.',
        riskLevel: 'critical' as const,
        healthImpact: '수면 박탈로 인한 인지능력 저하, 의료사고 위험 증가, 심혈관계 부담',
        dates: ['2024-03-05', '2024-03-06'],
        shiftSequence: ['데이(6-14)', '나이트(22-6)'],
        recommendedAction: '데이와 나이트 사이에 최소 1일 휴식 필수',
        safetyScore: 15
      },
      {
        id: '2',
        employeeId: '3',
        employeeName: '이민호',
        team: 'B팀',
        patternType: 'consecutive_nights' as const,
        patternName: '4연속 야간근무',
        description: '4일 연속 야간근무로 배정되어 누적 피로와 건강 악화가 우려됩니다.',
        riskLevel: 'critical' as const,
        healthImpact: '수면 리듬 파괴, 면역력 저하, 정신건강 악화, 안전사고 위험',
        dates: ['2024-03-08', '2024-03-09', '2024-03-10', '2024-03-11'],
        shiftSequence: ['나이트', '나이트', '나이트', '나이트'],
        recommendedAction: '연속 야간근무는 최대 3일로 제한, 즉시 재배정',
        safetyScore: 20
      },
      {
        id: '3',
        employeeId: '8',
        employeeName: '윤서진',
        team: 'B팀',
        patternType: 'day_night_off' as const,
        patternName: '급격한 시프트 변경',
        description: '데이 근무 후 8시간 만에 나이트 근무 시작으로 회복 시간 부족',
        riskLevel: 'high' as const,
        healthImpact: '급성 피로, 집중력 저하, 실수 증가',
        dates: ['2024-03-12', '2024-03-13'],
        shiftSequence: ['데이(6-14)', '나이트(22-6)'],
        recommendedAction: '시프트 간 최소 16시간 휴식 보장',
        safetyScore: 35
      },
      {
        id: '4',
        employeeId: '1',
        employeeName: '김철수',
        team: 'A팀',
        patternType: 'excessive_changes' as const,
        patternName: '과도한 시프트 변경',
        description: '1주일 내 5번의 시프트 유형 변경으로 생체리듬 혼란 초래',
        riskLevel: 'high' as const,
        healthImpact: '생체리듬 장애, 수면의 질 저하, 스트레스 증가',
        dates: ['2024-03-15', '2024-03-16', '2024-03-17', '2024-03-18', '2024-03-19'],
        shiftSequence: ['데이', '이브닝', '나이트', '데이', '이브닝'],
        recommendedAction: '1주일 내 시프트 변경 최대 2회로 제한',
        safetyScore: 40
      },
      {
        id: '5',
        employeeId: '3',
        employeeName: '이민호',
        team: 'B팀',
        patternType: 'insufficient_rest' as const,
        patternName: '휴식 시간 부족',
        description: '시프트 간 10시간 휴식으로 충분한 회복 시간 미확보',
        riskLevel: 'medium' as const,
        healthImpact: '피로 누적, 업무 효율성 저하',
        dates: ['2024-03-20', '2024-03-21'],
        shiftSequence: ['이브닝(14-22)', '데이(6-14)'],
        recommendedAction: '시프트 간 최소 12시간 휴식 보장',
        safetyScore: 55
      },
      {
        id: '6',
        employeeId: '6',
        employeeName: '김지은',
        team: 'C팀',
        patternType: 'weekend_overload' as const,
        patternName: '주말 연속 근무',
        description: '3주 연속 주말 근무로 가족 생활과 휴식권 침해',
        riskLevel: 'medium' as const,
        healthImpact: '번아웃 증후군, 사회적 고립감, 정신적 스트레스',
        dates: ['2024-03-02', '2024-03-03', '2024-03-09', '2024-03-10', '2024-03-16', '2024-03-17'],
        shiftSequence: ['주말근무', '주말근무', '주말근무'],
        recommendedAction: '주말 근무 로테이션 시스템 도입',
        safetyScore: 60
      }
    ],

    safetyRecommendations: [
      {
        priority: 'immediate' as const,
        category: 'regulatory' as const,
        title: '데이나오 패턴 즉시 제거',
        description: '김철수, 윤서진의 데이나오 패턴은 근로기준법 위반 소지가 있으며 심각한 안전사고로 이어질 수 있습니다. 즉시 스케줄 재조정이 필요합니다.',
        affectedEmployees: ['김철수', '윤서진'],
        estimatedImpact: '의료사고 위험 70% 감소, 법적 리스크 해소',
        actionRequired: '데이와 나이트 근무 사이 최소 24시간 휴식 보장'
      },
      {
        priority: 'urgent' as const,
        category: 'health' as const,
        title: '이민호 연속 야간근무 재배정',
        description: '4일 연속 야간근무는 WHO 권고사항을 위반하며, 직원의 건강과 환자 안전에 심각한 위험을 초래합니다.',
        affectedEmployees: ['이민호'],
        estimatedImpact: '수면의 질 50% 개선, 업무 집중도 향상',
        actionRequired: '야간근무를 다른 직원과 분담, 연속 야간 최대 3일 제한'
      },
      {
        priority: 'urgent' as const,
        category: 'operational' as const,
        title: 'B팀 전체 스케줄 재검토',
        description: 'B팀의 평균 안전성 점수가 67.7점으로 위험 수준입니다. 팀 전체의 스케줄 패턴을 재검토하여 안전성을 확보해야 합니다.',
        affectedEmployees: ['이민호', '정수진', '윤서진'],
        estimatedImpact: '팀 안전성 점수 80점 이상 목표',
        actionRequired: '팀 내 시프트 재분배 및 추가 인력 충원 검토'
      },
      {
        priority: 'moderate' as const,
        category: 'preventive' as const,
        title: '시프트 변경 빈도 제한 정책 도입',
        description: '과도한 시프트 변경으로 인한 생체리듬 장애를 예방하기 위해 주간 시프트 변경 빈도를 제한하는 정책이 필요합니다.',
        affectedEmployees: ['김철수', '정수진', '김지은'],
        estimatedImpact: '직원 만족도 향상, 피로도 감소',
        actionRequired: '주간 시프트 변경 최대 2회 제한 정책 수립'
      },
      {
        priority: 'low' as const,
        category: 'operational' as const,
        title: '주말 근무 로테이션 시스템 개선',
        description: '공정한 주말 근무 분배를 위한 로테이션 시스템을 도입하여 특정 직원에게 주말 근무가 집중되는 것을 방지합니다.',
        affectedEmployees: ['김지은', '최동욱'],
        estimatedImpact: '업무 공정성 향상, 직원 만족도 개선',
        actionRequired: '월별 주말 근무 로테이션 스케줄 수립'
      }
    ]
  }

  return (
    <div className="p-6">
      <PatternSafetyReport
        metrics={mockPatternSafetyMetrics}
        scheduleId="schedule_2024_03_001"
        scheduleName="2024년 3월 간호팀 스케줄"
        generatedAt="2024-03-01 14:30"
      />
    </div>
  )
}