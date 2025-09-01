export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'employee'
export type ShiftType = 'day' | 'evening' | 'night'
export type RequestStatus = 'pending' | 'accepted' | 'approved' | 'rejected' | 'cancelled'
export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          tenant_id: string
          name: string
          address: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          address?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          address?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          site_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          tenant_id: string
          team_id: string | null
          auth_user_id: string | null
          email: string
          name: string
          employee_code: string | null
          role: UserRole
          phone: string | null
          hire_date: string | null
          skills: Json
          preferences: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          team_id?: string | null
          auth_user_id?: string | null
          email: string
          name: string
          employee_code?: string | null
          role?: UserRole
          phone?: string | null
          hire_date?: string | null
          skills?: Json
          preferences?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          team_id?: string | null
          auth_user_id?: string | null
          email?: string
          name?: string
          employee_code?: string | null
          role?: UserRole
          phone?: string | null
          hire_date?: string | null
          skills?: Json
          preferences?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      rulesets: {
        Row: {
          id: string
          tenant_id: string
          name: string
          rules: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          rules?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          rules?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      shift_templates: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: ShiftType
          start_time: string
          end_time: string
          duration_hours: number | null
          break_minutes: number
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: ShiftType
          start_time: string
          end_time: string
          duration_hours?: number | null
          break_minutes?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: ShiftType
          start_time?: string
          end_time?: string
          duration_hours?: number | null
          break_minutes?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      patterns: {
        Row: {
          id: string
          tenant_id: string
          name: string
          pattern: Json
          cycle_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          pattern: Json
          cycle_days: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          pattern?: Json
          cycle_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          tenant_id: string
          site_id: string
          name: string
          start_date: string
          end_date: string
          ruleset_id: string | null
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          site_id: string
          name: string
          start_date: string
          end_date: string
          ruleset_id?: string | null
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          site_id?: string
          name?: string
          start_date?: string
          end_date?: string
          ruleset_id?: string | null
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedule_assignments: {
        Row: {
          id: string
          schedule_id: string
          employee_id: string
          shift_template_id: string | null
          date: string
          start_time: string
          end_time: string
          is_overtime: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          employee_id: string
          shift_template_id?: string | null
          date: string
          start_time: string
          end_time: string
          is_overtime?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          employee_id?: string
          shift_template_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          is_overtime?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leaves: {
        Row: {
          id: string
          employee_id: string
          type: LeaveType
          start_date: string
          end_date: string
          reason: string | null
          status: RequestStatus
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          type: LeaveType
          start_date: string
          end_date: string
          reason?: string | null
          status?: RequestStatus
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          type?: LeaveType
          start_date?: string
          end_date?: string
          reason?: string | null
          status?: RequestStatus
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      absences: {
        Row: {
          id: string
          employee_id: string
          date: string
          reason: string | null
          is_notified: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          reason?: string | null
          is_notified?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          reason?: string | null
          is_notified?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trainings: {
        Row: {
          id: string
          employee_id: string
          title: string
          start_date: string
          end_date: string
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          title: string
          start_date: string
          end_date: string
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          title?: string
          start_date?: string
          end_date?: string
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      swap_requests: {
        Row: {
          id: string
          requester_id: string
          requester_assignment_id: string
          target_id: string
          target_assignment_id: string
          reason: string | null
          status: RequestStatus
          target_accepted_at: string | null
          approved_by: string | null
          approved_at: string | null
          rejected_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          requester_assignment_id: string
          target_id: string
          target_assignment_id: string
          reason?: string | null
          status?: RequestStatus
          target_accepted_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          requester_assignment_id?: string
          target_id?: string
          target_assignment_id?: string
          reason?: string | null
          status?: RequestStatus
          target_accepted_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          type: string
          title: string
          message: string | null
          data: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          type: string
          title: string
          message?: string | null
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          type?: string
          title?: string
          message?: string | null
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          tenant_id: string
          type: string
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: string
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type?: string
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_employee: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Tables']['employees']['Row']
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_manager_or_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      shift_type: ShiftType
      request_status: RequestStatus
      leave_type: LeaveType
    }
  }
}