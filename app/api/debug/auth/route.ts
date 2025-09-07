import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 1. Auth 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        step: 'auth',
        error: authError?.message || 'No user found',
        user: null
      })
    }
    
    // 2. Employee 조회 - auth_user_id로
    const { data: employeeByAuthId, error: error1 } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
    
    // 3. Employee 조회 - email로
    const { data: employeeByEmail, error: error2 } = await supabase
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .single()
    
    // 4. 모든 admin 역할 직원 조회
    const { data: allAdmins, error: error3 } = await supabase
      .from('employees')
      .select('id, email, name, role, auth_user_id')
      .eq('role', 'admin')
    
    return NextResponse.json({
      success: true,
      auth: {
        userId: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      queries: {
        byAuthId: {
          data: employeeByAuthId,
          error: error1?.message
        },
        byEmail: {
          data: employeeByEmail,
          error: error2?.message
        },
        allAdmins: {
          data: allAdmins,
          error: error3?.message
        }
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}