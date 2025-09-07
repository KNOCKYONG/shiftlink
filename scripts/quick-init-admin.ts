import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Supabase 관리자 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function quickInitAdmin() {
  try {
    console.log('🚀 Admin 계정 빠른 초기화 시작...')
    
    const email = 'admin@shiftlink.com'
    const password = 'admin123' // 기본 비밀번호
    
    // 1. 기존 사용자 확인
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    
    const existingUser = existingUsers?.users.find(u => u.email === email)
    let authUserId: string
    
    if (existingUser) {
      console.log('📝 기존 계정 발견, 비밀번호 업데이트 중...')
      authUserId = existingUser.id
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { password }
      )
      
      if (updateError) {
        console.error('❌ 비밀번호 업데이트 실패:', updateError.message)
        process.exit(1)
      }
    } else {
      console.log('✨ 새 Admin 계정 생성 중...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: 'System Admin',
          role: 'admin'
        }
      })
      
      if (createError) {
        console.error('❌ 계정 생성 실패:', createError.message)
        process.exit(1)
      }
      
      if (!newUser?.user) {
        console.error('❌ 사용자 생성 실패')
        process.exit(1)
      }
      
      authUserId = newUser.user.id
    }
    
    // 2. 기본 tenant 생성 또는 조회
    let { data: tenant } = await supabase
      .from('tenants')
      .select('id, sites(id, teams(id))')
      .eq('slug', 'default')
      .single()
    
    let tenantId: string
    let teamId: string | null = null
    
    if (!tenant) {
      console.log('🏢 기본 회사 생성 중...')
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Company',
          slug: 'default',
          settings: {
            features: {
              swap_requests: true,
              auto_schedule: true,
              email_notifications: true
            }
          }
        })
        .select()
        .single()
      
      if (tenantError) {
        console.error('❌ 회사 생성 실패:', tenantError.message)
        process.exit(1)
      }
      
      tenantId = newTenant.id
      
      // 기본 site 생성
      const { data: site } = await supabase
        .from('sites')
        .insert({
          tenant_id: tenantId,
          name: '본사',
          timezone: 'Asia/Seoul'
        })
        .select()
        .single()
      
      if (site) {
        // 기본 team 생성
        const { data: team } = await supabase
          .from('teams')
          .insert({
            site_id: site.id,
            name: '관리팀',
            description: '시스템 관리팀'
          })
          .select()
          .single()
        
        if (team) {
          teamId = team.id
        }
      }
    } else {
      tenantId = tenant.id
      if (tenant.sites && tenant.sites[0]?.teams?.[0]) {
        teamId = tenant.sites[0].teams[0].id
      }
    }
    
    // 3. Employee 레코드 생성 또는 업데이트
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existingEmployee) {
      console.log('📝 기존 직원 정보 업데이트 중...')
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          auth_user_id: authUserId,
          role: 'admin',
          is_active: true
        })
        .eq('id', existingEmployee.id)
      
      if (updateError) {
        console.error('⚠️ 직원 정보 업데이트 실패:', updateError.message)
      }
    } else {
      console.log('👤 Admin 직원 정보 생성 중...')
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          tenant_id: tenantId,
          team_id: teamId,
          auth_user_id: authUserId,
          email,
          name: 'System Admin',
          role: 'admin',
          department: '관리부',
          employee_code: 'ADMIN001',
          hire_date: new Date().toISOString().split('T')[0],
          is_active: true,
          skills: [],
          preferences: {}
        })
      
      if (employeeError) {
        console.error('⚠️ 직원 정보 생성 실패:', employeeError.message)
      }
    }
    
    console.log('\n✅ Admin 계정 초기화 완료!')
    console.log('=====================================')
    console.log('📋 로그인 정보:')
    console.log(`   URL: http://10.20.200.21:3003/login`)
    console.log(`   이메일: ${email}`)
    console.log(`   비밀번호: ${password}`)
    console.log('\n⚠️  보안을 위해 나중에 비밀번호를 변경하세요!')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 스크립트 실행
quickInitAdmin()