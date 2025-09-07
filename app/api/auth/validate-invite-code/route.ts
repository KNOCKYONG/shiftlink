import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    console.log('Validating invite code (GET):', code)

    if (!code) {
      return NextResponse.json(
        { valid: false, error: '초대 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // First, let's see all tenants to debug
    const { data: allTenants, error: allError } = await supabase
      .from('tenants')
      .select('id, name, invite_code')

    console.log('All tenants in database:', allTenants)
    console.log('All tenants error:', allError)

    // Now try to find the specific tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, invite_code')
      .eq('invite_code', code.toUpperCase())
      .single()

    console.log('Specific query for code:', code.toUpperCase())
    console.log('Query result:', { tenant, error })

    if (error || !tenant) {
      console.log('No tenant found with invite code:', code)
      
      // Try case-insensitive search using ilike
      const { data: tenantIlike, error: ilikeError } = await supabase
        .from('tenants')
        .select('id, name, invite_code')
        .ilike('invite_code', code)
        .single()
      
      console.log('Case-insensitive search result:', { tenantIlike, ilikeError })
      
      if (tenantIlike) {
        return NextResponse.json({
          valid: true,
          tenant_id: tenantIlike.id,
          tenant_name: tenantIlike.name
        })
      }
      
      return NextResponse.json(
        { valid: false, error: '유효하지 않은 초대 코드입니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      tenant_id: tenant.id,
      tenant_name: tenant.name
    })
  } catch (error) {
    console.error('Invite code validation error:', error)
    return NextResponse.json(
      { error: '초대 코드 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// Keep POST for backward compatibility
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code } = body

    console.log('Validating invite code (POST):', code)

    if (!code) {
      return NextResponse.json(
        { valid: false, error: '초대 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Find tenant with matching invite code
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, invite_code')
      .eq('invite_code', code.toUpperCase())
      .single()

    console.log('Query result:', { tenant, error })

    if (error || !tenant) {
      console.log('No tenant found with invite code:', code)
      return NextResponse.json(
        { valid: false, error: '유효하지 않은 초대 코드입니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      tenant_id: tenant.id,
      tenant_name: tenant.name
    })
  } catch (error) {
    console.error('Invite code validation error:', error)
    return NextResponse.json(
      { error: '초대 코드 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}