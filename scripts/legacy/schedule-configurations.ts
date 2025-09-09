import { createClient } from '@/lib/supabase/client'

export interface ScheduleConfiguration {
  id: string
  name: string
  user_id: string
  tenant_id?: string
  config: {
    scheduleName: string
    siteId: string
    teamIds: string[]
    startDate: string
    endDate: string
    shiftLabels: {
      day: string
      evening: string
      night: string
    }
    coverageRequirements: any[]
    generationOptions: any
    levelSettings?: {
      maxLevel: number
      levelBatchValues: {
        day: Record<string, string>
        evening: Record<string, string>
        night: Record<string, string>
      }
      levelTitles?: Record<string, string>
    }
  }
  created_at: string
  updated_at: string
}

export interface CreateScheduleConfigurationData {
  name: string
  tenant_id?: string
  config: ScheduleConfiguration['config']
}

export interface UpdateScheduleConfigurationData {
  name?: string
  config?: ScheduleConfiguration['config']
}

class ScheduleConfigurationAPI {
  private supabase = createClient()

  /**
   * 현재 사용자의 모든 스케줄 설정을 가져옵니다
   */
  async getAll(): Promise<ScheduleConfiguration[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('schedule_configurations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching schedule configurations:', error)
      throw new Error(`Failed to fetch schedule configurations: ${error.message}`)
    }

    return data || []
  }

  /**
   * ID로 특정 스케줄 설정을 가져옵니다
   */
  async getById(id: string): Promise<ScheduleConfiguration | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('schedule_configurations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching schedule configuration:', error)
      throw new Error(`Failed to fetch schedule configuration: ${error.message}`)
    }

    return data
  }

  /**
   * 새로운 스케줄 설정을 생성합니다
   */
  async create(data: CreateScheduleConfigurationData): Promise<ScheduleConfiguration> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get tenant_id from user metadata if not provided
    const tenant_id = data.tenant_id || user.user_metadata?.tenant_id

    const insertData = {
      name: data.name,
      user_id: user.id,
      tenant_id,
      config: data.config
    }

    const { data: result, error } = await this.supabase
      .from('schedule_configurations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating schedule configuration:', error)
      throw new Error(`Failed to create schedule configuration: ${error.message}`)
    }

    return result
  }

  /**
   * 기존 스케줄 설정을 업데이트합니다
   */
  async update(id: string, data: UpdateScheduleConfigurationData): Promise<ScheduleConfiguration> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: result, error } = await this.supabase
      .from('schedule_configurations')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating schedule configuration:', error)
      throw new Error(`Failed to update schedule configuration: ${error.message}`)
    }

    return result
  }

  /**
   * 스케줄 설정을 삭제합니다
   */
  async delete(id: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await this.supabase
      .from('schedule_configurations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting schedule configuration:', error)
      throw new Error(`Failed to delete schedule configuration: ${error.message}`)
    }
  }

  /**
   * 설정 이름으로 검색합니다
   */
  async searchByName(searchTerm: string): Promise<ScheduleConfiguration[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await this.supabase
      .from('schedule_configurations')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching schedule configurations:', error)
      throw new Error(`Failed to search schedule configurations: ${error.message}`)
    }

    return data || []
  }
}

// Export singleton instance
export const scheduleConfigurationAPI = new ScheduleConfigurationAPI()