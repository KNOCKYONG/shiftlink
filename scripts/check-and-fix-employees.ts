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

async function checkAndFixEmployees() {
  try {
    console.log('🔍 데이터베이스 구조 확인 중...')
    
    // 1. Auth 사용자 목록 확인
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Auth 사용자 조회 실패:', authError.message)
      process.exit(1)
    }
    
    console.log(`\n✅ Auth 사용자: ${authUsers?.users.length || 0}명`)
    authUsers?.users.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`)
    })
    
    // 2. Employees 테이블 확인
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
    
    if (employeesError) {
      console.error('❌ Employees 테이블 조회 실패:', employeesError.message)
      
      // 테이블이 없는 경우 생성
      if (employeesError.message.includes('relation') && employeesError.message.includes('does not exist')) {
        console.log('\n📝 Employees 테이블이 없습니다. 생성이 필요합니다.')
      }
    } else {
      console.log(`\n✅ Employees 레코드: ${employees?.length || 0}개`)
      employees?.forEach(emp => {
        console.log(`   - ${emp.email} (Role: ${emp.role}, Active: ${emp.is_active})`)
        if (emp.auth_user_id) {
          console.log(`     └─ auth_user_id: ${emp.auth_user_id}`)
        }
      })
    }
    
    // 3. admin@shiftlink.com 계정 확인 및 연결
    const adminEmail = 'admin@shiftlink.com'
    const adminUser = authUsers?.users.find(u => u.email === adminEmail)
    
    if (adminUser) {
      console.log(`\n🔧 ${adminEmail} 계정 처리 중...`)
      
      // Employees 테이블에서 해당 이메일 확인
      const { data: adminEmployee, error: checkError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', adminEmail)
        .single()
      
      if (checkError || !adminEmployee) {
        // Employee 레코드가 없으면 생성
        console.log('   📝 Employee 레코드 생성 중...')
        
        // 기본 tenant 확인/생성
        let { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', 'default')
          .single()
        
        if (!tenant) {
          const { data: newTenant } = await supabase
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
          
          tenant = newTenant
        }
        
        const { error: insertError } = await supabase
          .from('employees')
          .insert({
            tenant_id: tenant?.id,
            auth_user_id: adminUser.id,
            email: adminEmail,
            name: 'System Admin',
            role: 'admin',
            department: '관리부',
            employee_code: 'ADMIN001',
            hire_date: new Date().toISOString().split('T')[0],
            is_active: true,
            skills: [],
            preferences: {}
          })
        
        if (insertError) {
          console.error('   ❌ Employee 생성 실패:', insertError.message)
        } else {
          console.log('   ✅ Employee 레코드 생성 완료')
        }
      } else {
        // Employee 레코드가 있으면 auth_user_id 업데이트
        if (adminEmployee.auth_user_id !== adminUser.id) {
          console.log('   📝 auth_user_id 연결 업데이트 중...')
          
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              auth_user_id: adminUser.id,
              is_active: true
            })
            .eq('email', adminEmail)
          
          if (updateError) {
            console.error('   ❌ 업데이트 실패:', updateError.message)
          } else {
            console.log('   ✅ auth_user_id 연결 완료')
          }
        } else {
          console.log('   ✅ 이미 올바르게 연결되어 있습니다.')
        }
      }
    } else {
      console.log(`\n⚠️  ${adminEmail} Auth 사용자가 없습니다.`)
      console.log('   💡 init-admin.ts 또는 quick-init-admin.ts를 실행하세요.')
    }
    
    // 4. 최종 상태 확인
    console.log('\n📊 최종 상태 확인:')
    
    const { data: finalEmployee } = await supabase
      .from('employees')
      .select('*')
      .eq('email', adminEmail)
      .single()
    
    if (finalEmployee) {
      console.log('✅ admin@shiftlink.com Employee 레코드:')
      console.log(`   - email: ${finalEmployee.email}`)
      console.log(`   - role: ${finalEmployee.role}`)
      console.log(`   - auth_user_id: ${finalEmployee.auth_user_id}`)
      console.log(`   - is_active: ${finalEmployee.is_active}`)
      
      if (finalEmployee.auth_user_id) {
        const authUser = authUsers?.users.find(u => u.id === finalEmployee.auth_user_id)
        if (authUser) {
          console.log('   ✅ Auth 사용자와 연결됨')
        } else {
          console.log('   ⚠️ auth_user_id가 있지만 Auth 사용자를 찾을 수 없음')
        }
      } else {
        console.log('   ⚠️ auth_user_id가 없음 - 연결 필요')
      }
    } else {
      console.log('❌ admin@shiftlink.com Employee 레코드를 찾을 수 없음')
    }
    
    console.log('\n✅ 데이터베이스 확인 및 수정 완료!')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 스크립트 실행
checkAndFixEmployees()