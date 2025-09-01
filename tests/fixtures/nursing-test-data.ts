/**
 * 간호 업종 E2E 테스트 데이터 픽스처
 */

export const NURSING_TENANT_DATA = {
  id: 'nursing-test-tenant',
  name: '서울종합병원',
  domain: 'seoul-hospital',
  industry_type: 'healthcare_nursing',
  settings: {
    timezone: 'Asia/Seoul',
    week_starts_on: 1,
    default_language: 'ko',
    shift_patterns: {
      day: { start: '06:00', end: '14:00' },
      evening: { start: '14:00', end: '22:00' },
      night: { start: '22:00', end: '06:00' }
    },
    minimum_rest_hours: 11,
    maximum_weekly_hours: 52,
    max_consecutive_nights: 5,
    max_consecutive_work_days: 7,
    allow_dangerous_patterns: false,
    enable_fatigue_monitoring: true,
    fatigue_alert_threshold: 7,
    auto_generate_schedule: true,
    generation_advance_days: 30,
    prefer_pattern_continuity: true,
    balance_workload: true
  }
};

export const NURSING_TEAMS = [
  {
    name: '내과병동',
    description: '내과 일반병동',
    department: 'internal_medicine',
    min_required_per_shift: 3,
    specialties: ['일반내과', '소화기내과', '순환기내과']
  },
  {
    name: '외과병동', 
    description: '외과 일반병동',
    department: 'surgery',
    min_required_per_shift: 3,
    specialties: ['일반외과', '정형외과', '신경외과']
  },
  {
    name: '중환자실',
    description: '집중치료실',
    department: 'icu',
    min_required_per_shift: 4,
    specialties: ['내과중환자실', '외과중환자실', '심장중환자실']
  },
  {
    name: '응급실',
    description: '응급의료센터', 
    department: 'emergency',
    min_required_per_shift: 5,
    specialties: ['응급의학과', '외상센터']
  }
];

export const NURSING_EMPLOYEES = [
  // 수간호사 (Head Nurses) - Manager role
  { 
    role: 'manager', 
    position: '수간호사',
    korean_title: '수간호사',
    experience_years: 15,
    skill_level: 'expert',
    can_work_nights: true,
    preferred_shifts: ['day'],
    team_assignment: '내과병동'
  },
  { 
    role: 'manager', 
    position: '수간호사',
    korean_title: '수간호사',
    experience_years: 18,
    skill_level: 'expert', 
    can_work_nights: true,
    preferred_shifts: ['day'],
    team_assignment: '외과병동'
  },

  // 책임간호사 (Charge Nurses) - Senior Employee
  { 
    role: 'employee', 
    position: '책임간호사',
    korean_title: '책임간호사',
    experience_years: 8,
    skill_level: 'expert',
    can_work_nights: true,
    preferred_shifts: ['day', 'evening'],
    team_assignment: '내과병동'
  },
  { 
    role: 'employee', 
    position: '책임간호사',
    korean_title: '책임간호사',
    experience_years: 10,
    skill_level: 'expert',
    can_work_nights: true,
    preferred_shifts: ['evening', 'night'],
    team_assignment: '외과병동'
  },
  { 
    role: 'employee', 
    position: '책임간호사',
    korean_title: '책임간호사',
    experience_years: 12,
    skill_level: 'expert',
    can_work_nights: true,
    preferred_shifts: ['day', 'night'],
    team_assignment: '중환자실'
  },
  { 
    role: 'employee', 
    position: '책임간호사',
    korean_title: '책임간호사',
    experience_years: 9,
    skill_level: 'expert',
    can_work_nights: true,
    preferred_shifts: ['day', 'evening', 'night'],
    team_assignment: '응급실'
  },

  // 일반간호사 (Staff Nurses) - 20명
  ...Array.from({ length: 20 }, (_, i) => ({
    role: 'employee',
    position: '간호사',
    korean_title: '일반간호사',
    experience_years: Math.floor(Math.random() * 10) + 2, // 2-11년
    skill_level: Math.random() > 0.3 ? 'intermediate' : 'expert',
    can_work_nights: Math.random() > 0.1, // 90%가 야간 근무 가능
    preferred_shifts: getRandomPreferredShifts(),
    team_assignment: NURSING_TEAMS[i % 4].name,
    personal_constraints: getRandomConstraints()
  })),

  // 신규간호사 (New Nurses) - 4명
  ...Array.from({ length: 4 }, (_, i) => ({
    role: 'employee',
    position: '간호사',
    korean_title: '신규간호사', 
    experience_years: 0,
    skill_level: 'beginner',
    can_work_nights: false, // 신규간호사는 야간 근무 제한
    preferred_shifts: ['day'],
    team_assignment: NURSING_TEAMS[i % 2].name, // 내과병동, 외과병동에만 배치
    personal_constraints: ['no_night_shifts', 'requires_preceptor']
  }))
];

function getRandomPreferredShifts(): string[] {
  const shifts = ['day', 'evening', 'night'];
  const numPreferred = Math.floor(Math.random() * 3) + 1;
  return shifts.sort(() => Math.random() - 0.5).slice(0, numPreferred);
}

function getRandomConstraints(): string[] {
  const constraints = [
    'no_weekend_nights',
    'prefers_consistent_schedule', 
    'childcare_morning_constraint',
    'education_tuesday_constraint',
    'health_no_consecutive_nights'
  ];
  
  const numConstraints = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0;
  return constraints.sort(() => Math.random() - 0.5).slice(0, numConstraints);
}

export const DANGEROUS_PATTERNS = {
  // 데이나오 패턴 (Day-Night-Off) - 극도로 위험한 패턴
  DAY_NIGHT_OFF: ['day', 'night', 'off'],
  
  // 기타 위험 패턴들
  EVENING_NIGHT_DAY: ['evening', 'night', 'day'],
  NIGHT_DAY_EVENING: ['night', 'day', 'evening'],
  
  // 연속 야간 후 즉시 데이 근무
  CONSECUTIVE_NIGHTS_TO_DAY: ['night', 'night', 'night', 'day'],
  
  // 7일 연속 근무
  SEVEN_CONSECUTIVE: Array(7).fill('day')
};

export const SHIFT_CONSTRAINTS = {
  // 11시간 최소 휴식 규칙
  MIN_REST_HOURS: 11,
  
  // 연속 야간 근무 제한
  MAX_CONSECUTIVE_NIGHTS: 5,
  
  // 주간 최대 근무시간 (52시간)
  MAX_WEEKLY_HOURS: 52,
  
  // 월간 최대 근무시간
  MAX_MONTHLY_HOURS: 200,
  
  // 교대당 최소 인원
  MIN_STAFF_PER_SHIFT: {
    day: 3,
    evening: 3, 
    night: 3
  },
  
  // 교대당 최소 경험자 비율
  MIN_EXPERIENCED_RATIO: 0.5,
  
  // 신규간호사 제약
  NEW_NURSE_CONSTRAINTS: {
    no_night_shifts: true,
    requires_preceptor: true,
    max_consecutive_days: 3
  }
};

export const TEST_SCHEDULES = {
  // 1주일 기본 스케줄 (정상 케이스)
  NORMAL_WEEK: {
    duration_days: 7,
    start_date: '2024-01-01',
    expected_violations: 0,
    expected_coverage: 1.0
  },
  
  // 1개월 스케줄 (복잡한 케이스)  
  MONTHLY: {
    duration_days: 28,
    start_date: '2024-01-01',
    expected_violations: 0,
    expected_coverage: 0.98,
    performance_threshold_seconds: 30
  },
  
  // 위험 패턴 포함 스케줄 (테스트용)
  WITH_VIOLATIONS: {
    duration_days: 14,
    start_date: '2024-01-01',
    forced_violations: ['DAY_NIGHT_OFF'],
    expected_violations: 1
  }
};

export const LEAVE_SCENARIOS = {
  // 연차 휴가
  ANNUAL_LEAVE: {
    type: 'annual',
    duration_days: 3,
    requires_approval: true,
    advance_days: 7
  },
  
  // 병가
  SICK_LEAVE: {
    type: 'sick',
    duration_days: 1,
    requires_approval: false,
    advance_days: 0,
    requires_document: true
  },
  
  // 응급 휴가
  EMERGENCY_LEAVE: {
    type: 'emergency',
    duration_days: 1,
    requires_approval: false,
    advance_days: 0,
    auto_approve: true
  },
  
  // 교육 휴가
  EDUCATION_LEAVE: {
    type: 'education',
    duration_days: 2,
    requires_approval: true,
    advance_days: 14
  }
};

export const FATIGUE_TEST_DATA = {
  // 높은 피로도 시나리오
  HIGH_FATIGUE: {
    consecutive_nights: 4,
    total_hours_week: 50,
    rest_hours_between: 8, // 11시간 미만
    expected_score: 8.5,
    expected_alert: true
  },
  
  // 정상 피로도
  NORMAL_FATIGUE: {
    consecutive_nights: 2,
    total_hours_week: 40,
    rest_hours_between: 12,
    expected_score: 4.2,
    expected_alert: false
  },
  
  // 위험 피로도 (번아웃 위험)
  CRITICAL_FATIGUE: {
    consecutive_nights: 5,
    total_hours_week: 56,
    rest_hours_between: 6,
    expected_score: 9.8,
    expected_alert: true,
    requires_intervention: true
  }
};

export const PERFORMANCE_BENCHMARKS = {
  // 스케줄 생성 성능
  SCHEDULE_GENERATION: {
    '30_employees_1_month': { max_seconds: 30 },
    '100_employees_1_month': { max_seconds: 120 },
    '30_employees_3_months': { max_seconds: 90 }
  },
  
  // API 응답 시간
  API_RESPONSE: {
    schedule_list: { max_ms: 2000 },
    employee_list: { max_ms: 1000 },
    leave_request: { max_ms: 500 },
    swap_request: { max_ms: 500 }
  },
  
  // UI 렌더링 시간
  UI_RENDERING: {
    dashboard_load: { max_ms: 3000 },
    schedule_view: { max_ms: 2000 },
    calendar_navigation: { max_ms: 1000 }
  }
};

export const SECURITY_TEST_DATA = {
  // SQL Injection 테스트
  SQL_INJECTION_PAYLOADS: [
    "'; DROP TABLE employees; --",
    "' OR '1'='1",
    "'; INSERT INTO employees (name) VALUES ('hacker'); --"
  ],
  
  // XSS 테스트
  XSS_PAYLOADS: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>"
  ],
  
  // 권한 테스트 시나리오
  AUTHORIZATION_TESTS: [
    { role: 'employee', should_access: ['/dashboard', '/leaves'], should_deny: ['/admin', '/settings'] },
    { role: 'manager', should_access: ['/dashboard', '/leaves', '/schedules'], should_deny: ['/admin'] },
    { role: 'admin', should_access: ['/dashboard', '/leaves', '/schedules', '/admin', '/settings'], should_deny: [] }
  ]
};