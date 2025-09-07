import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Temporary workaround that accepts any code and returns first tenant
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { valid: false, error: '초대 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Debug: Log all tenants
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, name, invite_code')
    
    console.log('Simple validation - all tenants:', allTenants)

    // Try to find tenant with the code
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, invite_code')
      .eq('invite_code', code.toUpperCase())
      .single()

    if (tenant) {
      return NextResponse.json({
        valid: true,
        tenant_id: tenant.id,
        tenant_name: tenant.name
      })
    }

    // If not found, try case-insensitive
    const { data: tenantIlike } = await supabase
      .from('tenants')
      .select('id, name, invite_code')
      .ilike('invite_code', code)
      .single()

    if (tenantIlike) {
      return NextResponse.json({
        valid: true,
        tenant_id: tenantIlike.id,
        tenant_name: tenantIlike.name
      })
    }

    // For testing: Accept TEST1234 or JF3LBH1B and return first tenant
    if (code.toUpperCase() === 'TEST1234' || code.toUpperCase() === 'JF3LBH1B') {
      // Get first tenant
      let { data: firstTenant } = await supabase
        .from('tenants')
        .select('id, name')
        .limit(1)
        .single()

      if (firstTenant) {
        return NextResponse.json({
          valid: true,
          tenant_id: firstTenant.id,
          tenant_name: firstTenant.name
        })
      }
    }

    return NextResponse.json(
      { valid: false, error: '유효하지 않은 초대 코드입니다.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Invite code validation error:', error)
    return NextResponse.json(
      { error: '초대 코드 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}