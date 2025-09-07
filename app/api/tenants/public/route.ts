import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all active tenants (public information)
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .order('name')

    if (error) {
      console.error('Error fetching tenants:', error)
      return NextResponse.json(
        { error: '병원 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tenants: tenants || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}