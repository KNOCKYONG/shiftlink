import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  try {
    console.log('🔐 로그인 테스트 시작...')
    console.log('===================================')
    
    const email = 'admin@shiftlink.com'
    const password = 'admin123' // 기본 비밀번호
    
    console.log(`\n📧 이메일: ${email}`)
    console.log('🔑 비밀번호로 로그인 시도 중...')
    
    // 1. 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('❌ 로그인 실패:', error.message)
      console.log('\n💡 비밀번호가 틀린 경우 reset-admin-password.ts를 실행하세요.')
      process.exit(1)
    }
    
    console.log('✅ 로그인 성공!')
    console.log(`   User ID: ${data.user?.id}`)
    console.log(`   Email: ${data.user?.email}`)
    
    // 2. Employee 정보 확인
    console.log('\n📋 Employee 정보 확인 중...')
    
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .single()
    
    if (empError) {
      console.error('⚠️ Employee 조회 실패:', empError.message)
    } else {
      console.log('✅ Employee 정보:')
      console.log(`   이름: ${employee.name}`)
      console.log(`   역할: ${employee.role}`)
      console.log(`   부서: ${employee.department}`)
      console.log(`   활성화: ${employee.is_active}`)
      console.log(`   Auth User ID: ${employee.auth_user_id}`)
    }
    
    // 3. 로그아웃
    await supabase.auth.signOut()
    console.log('\n✅ 로그아웃 완료')
    
    console.log('\n===================================')
    console.log('🎉 로그인 테스트 완료!')
    console.log(`   URL: http://10.20.200.21:3003/login`)
    console.log(`   이메일: ${email}`)
    console.log('   비밀번호로 로그인 가능합니다.')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 스크립트 실행
testLogin()