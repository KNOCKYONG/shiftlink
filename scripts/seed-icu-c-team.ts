import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

type Team = { id: string; name: string; site_id: string }
type Site = { id: string; name: string }
type Tenant = { id: string; name: string }

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      if (v !== undefined) result[k.replace(/^--/, '')] = v
      else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[k.replace(/^--/, '')] = args[i + 1]
        i++
      } else {
        result[k.replace(/^--/, '')] = 'true'
      }
    }
  }
  return result
}

function randomHireDate(): string {
  const start = new Date()
  start.setFullYear(start.getFullYear() - 8)
  const end = new Date()
  const ts = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  return new Date(ts).toISOString().split('T')[0]
}

async function main() {
  const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL')
  const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const args = parseArgs()
  const tenantIdArg = args['tenant-id']
  const tenantNameArg = args['tenant-name']
  const siteIdArg = args['site-id']

  // 1) Resolve tenant
  let tenant: Tenant | null = null
  if (tenantIdArg) {
    const { data } = await supabase.from('tenants').select('id, name').eq('id', tenantIdArg).single()
    tenant = data
  } else if (tenantNameArg) {
    const { data } = await supabase.from('tenants').select('id, name').eq('name', tenantNameArg).single()
    tenant = data
  } else {
    const { data } = await supabase.from('tenants').select('id, name').order('created_at', { ascending: true }).limit(1).single()
    tenant = data
  }
  if (!tenant) throw new Error('Tenant not found. Pass --tenant-id or --tenant-name')

  console.log(`→ Target tenant: ${tenant.name} (${tenant.id})`)

  // 2) Resolve site
  let site: Site | null = null
  if (siteIdArg) {
    const { data } = await supabase.from('sites').select('id, name').eq('id', siteIdArg).single()
    site = data
  } else {
    const { data } = await supabase.from('sites').select('id, name').eq('tenant_id', tenant.id).order('created_at', { ascending: true }).limit(1).single()
    site = data
  }
  if (!site) {
    const { data, error } = await supabase
      .from('sites')
      .insert({ tenant_id: tenant.id, name: '본사', timezone: 'Asia/Seoul' })
      .select('id, name')
      .single()
    if (error) throw error
    site = data
  }
  console.log(`→ Using site: ${site.name} (${site.id})`)

  // 3) Find ICU B team (optional reference)
  const { data: maybeB } = await supabase
    .from('teams')
    .select('id, name, site_id')
    .eq('site_id', site.id)
    .ilike('name', '%중환자실 B%')
    .limit(1)
  const bTeam = maybeB?.[0] as Team | undefined
  if (bTeam) console.log(`→ Found reference team: ${bTeam.name} (${bTeam.id})`)

  // 4) Ensure ICU C team exists
  let cTeam: Team | null = null
  {
    const { data } = await supabase
      .from('teams')
      .select('id, name, site_id')
      .eq('site_id', site.id)
      .eq('name', '중환자실 C팀')
      .single()
    cTeam = data as Team | null
  }
  if (!cTeam) {
    const { data, error } = await supabase
      .from('teams')
      .insert({ site_id: site.id, name: '중환자실 C팀', description: '중환자실 C팀' })
      .select('id, name, site_id')
      .single()
    if (error) throw error
    cTeam = data as Team
    console.log(`→ Created team: ${cTeam.name} (${cTeam.id})`)
  } else {
    console.log(`→ Using existing team: ${cTeam.name} (${cTeam.id})`)
  }

  // 5) Prepare 20 employees
  const employees = Array.from({ length: 20 }, (_, i) => {
    const idx = (i + 1).toString().padStart(2, '0')
    return {
      tenant_id: tenant!.id,
      team_id: cTeam!.id,
      auth_user_id: null,
      email: `icu.c${idx}@shiftlink.local`,
      name: `중환자실 C팀 간호사 ${idx}`,
      role: 'employee' as const,
      phone: null,
      hire_date: randomHireDate(),
      skills: ['icu'],
      preferences: {},
      is_active: true,
    }
  })

  // 6) Insert with upsert to avoid duplicates on repeated runs
  const { data: inserted, error: upsertError } = await supabase
    .from('employees')
    .upsert(employees, { onConflict: 'tenant_id,email', ignoreDuplicates: false })
    .select('id, name, email')

  if (upsertError) throw upsertError
  console.log(`→ Upserted ${inserted?.length ?? 0} employees into team ${cTeam.name}`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

