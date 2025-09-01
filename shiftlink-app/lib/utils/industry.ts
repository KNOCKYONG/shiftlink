/**
 * 업종 관련 유틸리티 함수들
 */

export interface IndustryConfig {
  industryType: string
  config: {
    enableNursingMode?: boolean
    dangerousPatternDetection?: boolean
    fatigueMonitoring?: boolean
    koreanLaborLawCompliance?: boolean
    customShiftNames?: {
      day: string
      evening: string
      night: string
      off: string
    }
  }
}

/**
 * 테넌트의 업종 설정을 가져오는 함수
 */
export async function getTenantIndustryConfig(tenantId: string): Promise<IndustryConfig> {
  const defaultConfig: IndustryConfig = {
    industryType: 'general',
    config: {
      enableNursingMode: false,
      dangerousPatternDetection: false,
      fatigueMonitoring: false,
      koreanLaborLawCompliance: false,
      customShiftNames: {
        day: 'Day',
        evening: 'Evening', 
        night: 'Night',
        off: 'Off'
      }
    }
  }

  try {
    // 이 함수는 서버 사이드에서만 사용
    if (typeof window !== 'undefined') {
      return defaultConfig
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 테넌트 업종 타입 가져오기
    const { data: tenant } = await supabase
      .from('tenants')
      .select('industry_type')
      .eq('id', tenantId)
      .single()

    // 업종 설정 가져오기
    const { data: config } = await supabase
      .from('industry_configurations')
      .select('config')
      .eq('tenant_id', tenantId)
      .single()

    const industryType = tenant?.industry_type || 'general'
    const industryConfig = config?.config || {}

    return {
      industryType,
      config: {
        ...defaultConfig.config,
        ...industryConfig
      }
    }
  } catch (error) {
    console.warn('Failed to load industry config:', error)
    return defaultConfig
  }
}

/**
 * 간호사 모드인지 확인하는 함수
 */
export function isNursingMode(config: IndustryConfig): boolean {
  return config.industryType === 'healthcare_nursing' && config.config.enableNursingMode === true
}

/**
 * 업종에 맞는 교대명을 가져오는 함수
 */
export function getShiftNames(config: IndustryConfig) {
  if (config.config.customShiftNames) {
    return config.config.customShiftNames
  }

  // 기본 교대명
  return {
    day: 'Day',
    evening: 'Evening',
    night: 'Night', 
    off: 'Off'
  }
}

/**
 * 업종에 맞는 스케줄링 옵션을 가져오는 함수
 */
export function getSchedulingOptions(config: IndustryConfig) {
  const baseOptions = {
    respect_preferences: true,
    fairness_enabled: true,
    avoid_conflicts: true,
    min_rest_hours: 8,
    max_consecutive_shifts: 5
  }

  if (isNursingMode(config)) {
    // 간호사 특화 옵션
    return {
      ...baseOptions,
      // 한국 간호사 특화
      avoid_dangerous_patterns: true,
      day_night_gap_required: true,
      fatigue_monitoring: true,
      korean_labor_law_compliance: true,
      
      // 더 엄격한 제약
      min_rest_hours: 11, // 한국 근로기준법
      max_consecutive_nights: 2,
      max_weekly_hours: 40,
      
      // 패턴 분석
      pattern_risk_analysis: true,
      dangerous_pattern_detection: true,
      
      // 공정성 가중치
      fairness_weight: 0.3,
      preference_weight: 0.3,
      workload_weight: 0.2,
      seniority_weight: 0.2
    }
  }

  return baseOptions
}

/**
 * 업종별 위험 패턴을 정의하는 함수
 */
export function getDangerousPatterns(config: IndustryConfig): string[][] {
  if (isNursingMode(config)) {
    // 간호사 특화 위험 패턴
    return [
      ['day', 'night', 'off'], // 데이나오 패턴
      ['evening', 'day', 'night'], // 이브닝-데이-나이트
      ['night', 'night', 'night'], // 연속 3일 야간
      ['day', 'day', 'day', 'day', 'day'] // 연속 5일 근무
    ]
  }

  // 일반 업종 위험 패턴
  return [
    ['night', 'night', 'night'], // 연속 3일 야간
    ['day', 'day', 'day', 'day', 'day', 'day'] // 연속 6일 근무
  ]
}

/**
 * 업종별 교대 색상을 가져오는 함수
 */
export function getShiftColors(config: IndustryConfig) {
  if (isNursingMode(config)) {
    // 간호사 모드 색상 (한국 간호계 관례)
    return {
      day: '#FEF3C7', // 데이 - 노란색
      evening: '#FED7AA', // 이브닝 - 주황색
      night: '#BFDBFE', // 나이트 - 파란색
      off: '#F3F4F6' // 오프 - 회색
    }
  }

  // 일반 모드 색상
  return {
    day: '#FEF3C7',
    evening: '#FED7AA', 
    night: '#C7D2FE',
    off: '#F3F4F6'
  }
}