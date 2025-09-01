// ShiftLink 공통 타입 정의

// ===============================
// 기본 엔티티 타입들
// ===============================

export interface Tenant {
  id: string
  name: string
  industry?: string
  timezone: string
  settings?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  tenant_id: string
  name: string
  address?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  tenant_id: string
  site_id: string
  name: string
  description?: string
  color?: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  tenant_id: string
  site_id: string
  team_id: string
  auth_user_id?: string
  name: string
  employee_code: string
  email?: string
  phone?: string
  role: 'admin' | 'manager' | 'employee'
  level: number
  hire_date: string
  is_active: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ===============================
// 교대 및 스케줄 관련 타입들
// ===============================

export type ShiftType = 'day' | 'evening' | 'night' | 'off'

export interface ShiftTemplate {
  id: string
  tenant_id: string
  name: string
  type: ShiftType
  start_time: string
  end_time: string
  color?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  tenant_id: string
  team_id: string
  name: string
  start_date: string
  end_date: string
  status: 'draft' | 'published' | 'archived'
  created_by: string
  published_at?: string
  created_at: string
  updated_at: string
}

export interface ScheduleAssignment {
  id: string
  schedule_id: string
  employee_id: string
  employee_name: string
  employee_code: string
  date: string
  shift_type: ShiftType
  shift_template_id?: string
  start_time?: string
  end_time?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  // 조인된 데이터
  employees?: Pick<Employee, 'id' | 'name' | 'employee_code' | 'level' | 'phone' | 'email'>
  shift_templates?: Pick<ShiftTemplate, 'name' | 'type' | 'start_time' | 'end_time' | 'color'>
}

// ===============================
// 교환/트레이드 관련 타입들
// ===============================

export type SwapRequestStatus = 'pending' | 'target_accepted' | 'approved' | 'rejected' | 'cancelled'

export interface SwapRequest {
  id: string
  requester_id: string
  target_employee_id: string
  original_assignment_id: string
  target_assignment_id: string
  original_date: string
  original_shift_type: ShiftType
  target_date: string
  target_shift_type: ShiftType
  message?: string
  status: SwapRequestStatus
  target_accepted_at?: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  // 조인된 데이터
  requester?: Pick<Employee, 'id' | 'name' | 'employee_code'>
  target_employee?: Pick<Employee, 'id' | 'name' | 'employee_code'>
}

export interface SwapSettings {
  id?: string
  tenant_id: string
  admin_approval_required: boolean
  allow_cross_shift_type: boolean
  allow_cross_team: boolean
  max_advance_days: number
  auto_approve_same_level: boolean
  auto_approve_same_team: boolean
  auto_approve_within_hours: number
  max_pending_requests_per_employee: number
  cooldown_hours: number
  notify_managers: boolean
  notify_team_members: boolean
  send_email_notifications: boolean
  send_kakao_notifications: boolean
  created_at?: string
  updated_at?: string
}

// ===============================
// 휴가/결근 관련 타입들
// ===============================

export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'emergency' | 'bereavement' | 'other'

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days_count: number
  reason?: string
  status: LeaveStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  // 조인된 데이터
  employee?: Pick<Employee, 'id' | 'name' | 'employee_code'>
  approver?: Pick<Employee, 'id' | 'name'>
}

export interface Absence {
  id: string
  employee_id: string
  date: string
  absence_type: 'sick' | 'emergency' | 'no_show' | 'late' | 'early_leave'
  reason?: string
  is_excused: boolean
  reported_by: string
  created_at: string
  updated_at: string
  // 조인된 데이터
  employee?: Pick<Employee, 'id' | 'name' | 'employee_code'>
  reporter?: Pick<Employee, 'id' | 'name'>
}

// ===============================
// 알림 관련 타입들
// ===============================

export type NotificationType = 
  | 'swap_request' 
  | 'swap_accepted' 
  | 'swap_rejected' 
  | 'swap_approved' 
  | 'swap_cancelled'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  | 'schedule_published'
  | 'absence_reported'
  | 'system_announcement'

export interface Notification {
  id: string
  tenant_id: string
  recipient_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
  updated_at: string
  // 조인된 데이터
  recipient?: Pick<Employee, 'id' | 'name' | 'employee_code'>
}

// ===============================
// 공유 관련 타입들
// ===============================

export type ShareType = 'view' | 'download' | 'subscribe'

export interface ScheduleShare {
  id: string
  schedule_id: string
  tenant_id: string
  share_token: string
  share_type: ShareType
  created_by: string
  allowed_viewers?: string[]
  require_password: boolean
  password_hash?: string
  created_at: string
  expires_at: string
  is_active: boolean
  deactivated_at?: string
  deactivated_by?: string
  include_personal_info: boolean
  allow_download: boolean
  allow_calendar_sync: boolean
  access_count: number
  last_accessed_at?: string
  description?: string
  custom_title?: string
  // 조인된 데이터
  creator?: Pick<Employee, 'id' | 'name' | 'employee_code'>
  schedule?: Pick<Schedule, 'id' | 'name' | 'start_date' | 'end_date'>
}

// ===============================
// API 응답 관련 타입들
// ===============================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
  meta?: {
    total?: number
    page?: number
    limit?: number
    pages?: number
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

// ===============================
// 대시보드 관련 타입들
// ===============================

export interface DashboardStats {
  today_working: number
  today_off: number
  night_workers: number
  attention_needed: number
  total_employees: number
  schedule_compliance: number
  pending_swaps: number
  pending_leaves: number
}

export interface KPIWidget {
  title: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
  icon?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  description?: string
  trend?: number[]
  breakdown?: Array<{
    label: string
    value: number
    color?: string
  }>
}

// ===============================
// 설정 관련 타입들
// ===============================

export interface RulesetConfig {
  id: string
  tenant_id: string
  name: string
  rules: {
    min_rest_hours: number
    max_consecutive_nights: number
    max_weekly_hours: number
    min_staff_per_shift: number
    balance_workload: boolean
    enforce_hierarchy: boolean
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

// ===============================
// 폼 및 UI 관련 타입들
// ===============================

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FilterOptions {
  employees?: string[]
  teams?: string[]
  shift_types?: ShiftType[]
  status?: string[]
  date_from?: string
  date_to?: string
}

// ===============================
// 유틸리티 타입들
// ===============================

export type DateRange = {
  start: Date
  end: Date
}

export type TimeRange = {
  start_time: string
  end_time: string
}

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

// ===============================
// 에러 관련 타입들
// ===============================

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
}

export type ErrorCode = 
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED' 
  | 'RESOURCE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'