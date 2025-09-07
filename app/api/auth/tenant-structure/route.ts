import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/auth/tenant-structure?tenant_id=...  
// Returns sites and teams for a tenant. Uses service key (server-side only).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch sites and nested teams for the tenant
    const { data: sites, error } = await supabase
      .from('sites')
      .select('id, name, teams(id, name, site_id)')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, sites: sites || [] })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load tenant structure' }, { status: 500 })
  }
}
