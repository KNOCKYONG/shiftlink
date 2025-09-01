// 시간대별 설정 관리 시스템
export interface ShiftTimeSettings {
  id: string
  tenant_id: string
  team_id?: string // null이면 전체 조직 기본값
  shift_type: 'day' | 'evening' | 'night' | 'off'
  start_time: string // "07:00"
  end_time: string // "15:00"
  display_name: string // "데이", "이브닝", "나이트"
  color_scheme: {
    background: string // "bg-blue-100"
    text: string // "text-blue-800"
    border: string // "border-blue-200"
  }
  korean_terms: {
    short: string // "데", "이", "나", "오"
    long: string // "주간", "저녁", "야간", "휴무"
    pattern: string // "나오오데" 패턴에서 사용할 약어
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

// 한국 간호사 용어 기본 설정
export const KOREAN_NURSING_DEFAULTS: Omit<ShiftTimeSettings, 'id' | 'tenant_id' | 'team_id' | 'created_at' | 'updated_at'>[] = [
  {
    shift_type: 'day',
    start_time: '07:00',
    end_time: '15:00',
    display_name: '데이',
    color_scheme: {
      background: 'bg-sky-100',
      text: 'text-sky-800',
      border: 'border-sky-200'
    },
    korean_terms: {
      short: '데',
      long: '주간',
      pattern: 'D'
    },
    is_active: true
  },
  {
    shift_type: 'evening',
    start_time: '15:00',
    end_time: '23:00',
    display_name: '이브닝',
    color_scheme: {
      background: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200'
    },
    korean_terms: {
      short: '이',
      long: '저녁',
      pattern: 'E'
    },
    is_active: true
  },
  {
    shift_type: 'night',
    start_time: '23:00',
    end_time: '07:00',
    display_name: '나이트',
    color_scheme: {
      background: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-200'
    },
    korean_terms: {
      short: '나',
      long: '야간',
      pattern: 'N'
    },
    is_active: true
  },
  {
    shift_type: 'off',
    start_time: '00:00',
    end_time: '00:00',
    display_name: '휴무',
    color_scheme: {
      background: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200'
    },
    korean_terms: {
      short: '오',
      long: '휴무',
      pattern: 'O'
    },
    is_active: true
  }
]

// 연차/휴가 전용 색상 설정
export const LEAVE_COLOR_SCHEMES = {
  annual: {
    background: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200'
  },
  sick: {
    background: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  personal: {
    background: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  emergency: {
    background: 'bg-pink-100',
    text: 'text-pink-800',
    border: 'border-pink-200'
  }
}

export class ShiftTimeSettingsManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * 조직/팀별 시간 설정 조회
   */
  async getShiftTimeSettings(tenantId: string, teamId?: string): Promise<ShiftTimeSettings[]> {
    let query = this.supabase
      .from('shift_time_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (teamId) {
      // 팀 전용 설정이 있으면 우선, 없으면 조직 기본값
      query = query.or(`team_id.eq.${teamId},team_id.is.null`)
    } else {
      query = query.is('team_id', null)
    }

    const { data: settings, error } = await query.order('shift_type')

    if (error) {
      console.error('Failed to fetch shift time settings:', error)
      throw error
    }

    // 팀별 설정이 있으면 우선, 없으면 조직 기본값 사용
    if (teamId && settings) {
      const processedSettings: ShiftTimeSettings[] = []
      const shiftTypes = ['day', 'evening', 'night', 'off']
      
      for (const shiftType of shiftTypes) {
        // 팀별 설정 찾기
        const teamSetting = settings.find(s => s.team_id === teamId && s.shift_type === shiftType)
        if (teamSetting) {
          processedSettings.push(teamSetting)
        } else {
          // 조직 기본값 사용
          const orgSetting = settings.find(s => s.team_id === null && s.shift_type === shiftType)
          if (orgSetting) {
            processedSettings.push(orgSetting)
          }
        }
      }
      
      return processedSettings
    }

    return settings || []
  }

  /**
   * 조직에 기본 한국 간호사 설정 초기화
   */
  async initializeNursingDefaults(tenantId: string): Promise<void> {
    const settingsToInsert = KOREAN_NURSING_DEFAULTS.map(setting => ({
      ...setting,
      tenant_id: tenantId,
      team_id: null, // 조직 기본값
      id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error } = await this.supabase
      .from('shift_time_settings')
      .insert(settingsToInsert)

    if (error) {
      console.error('Failed to initialize nursing defaults:', error)
      throw error
    }
  }

  /**
   * 팀별 커스텀 시간 설정 저장
   */
  async updateTeamShiftSettings(
    tenantId: string,
    teamId: string,
    settings: Partial<ShiftTimeSettings>[]
  ): Promise<void> {
    const settingsToUpsert = settings.map(setting => ({
      ...setting,
      tenant_id: tenantId,
      team_id: teamId,
      updated_at: new Date().toISOString()
    }))

    const { error } = await this.supabase
      .from('shift_time_settings')
      .upsert(settingsToUpsert, {
        onConflict: 'tenant_id,team_id,shift_type'
      })

    if (error) {
      console.error('Failed to update team shift settings:', error)
      throw error
    }
  }

  /**
   * 시간대별 설정을 기반으로 색상 얻기
   */
  getShiftColorScheme(
    shiftType: string,
    settings: ShiftTimeSettings[],
    leaveType?: string
  ): { background: string; text: string; border: string } {
    // 연차/휴가인 경우 전용 색상 사용
    if (leaveType && LEAVE_COLOR_SCHEMES[leaveType as keyof typeof LEAVE_COLOR_SCHEMES]) {
      return LEAVE_COLOR_SCHEMES[leaveType as keyof typeof LEAVE_COLOR_SCHEMES]
    }

    // 일반 시프트 색상
    const setting = settings.find(s => s.shift_type === shiftType)
    if (setting) {
      return setting.color_scheme
    }

    // 기본값 반환
    return {
      background: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200'
    }
  }

  /**
   * 한국 간호사 패턴 생성 (예: "나오오데")
   */
  generateKoreanPattern(
    assignments: Array<{ shift_type: string; leave_type?: string }>,
    settings: ShiftTimeSettings[]
  ): string {
    return assignments.map(assignment => {
      if (assignment.leave_type) {
        return '휴' // 연차/휴가는 "휴"로 표시
      }
      
      const setting = settings.find(s => s.shift_type === assignment.shift_type)
      return setting?.korean_terms.short || assignment.shift_type.charAt(0).toUpperCase()
    }).join('')
  }

  /**
   * 시간 설정을 기반으로 시프트 정보 포맷팅
   */
  formatShiftInfo(shiftType: string, settings: ShiftTimeSettings[]): {
    displayName: string
    timeRange: string
    koreanTerms: { short: string; long: string; pattern: string }
  } {
    const setting = settings.find(s => s.shift_type === shiftType)
    
    if (!setting) {
      return {
        displayName: shiftType,
        timeRange: '',
        koreanTerms: { short: shiftType.charAt(0), long: shiftType, pattern: shiftType.charAt(0).toUpperCase() }
      }
    }

    const timeRange = setting.shift_type === 'off' 
      ? '휴무' 
      : `${setting.start_time} - ${setting.end_time}`

    return {
      displayName: setting.display_name,
      timeRange,
      koreanTerms: setting.korean_terms
    }
  }
}