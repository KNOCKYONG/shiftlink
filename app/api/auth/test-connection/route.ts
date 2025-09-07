import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test auth connection
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Test database connection
    const { count, error: dbError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      auth: {
        connected: !authError,
        user: user?.email || null,
        error: authError?.message
      },
      database: {
        connected: !dbError,
        employeeCount: count,
        error: dbError?.message
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    
    const supabase = await createClient()
    
    // Test login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 })
    }
    
    // Get employee info
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .single()
    
    return NextResponse.json({
      success: true,
      user: data.user,
      employee: employee
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}