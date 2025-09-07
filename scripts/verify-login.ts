import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyLogin() {
  console.log('🔐 로그인 검증')
  console.log('=====================================')
  
  const email = 'admin@shiftlink.com'
  const password = 'admin123'
  
  console.log(`✉️  이메일: ${email}`)
  console.log('🔑 비밀번호: admin123')
  console.log('=====================================\n')
  
  // 1. Employee 데이터 확인
  console.log('1️⃣ Employee 데이터 확인...')
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('email', email)
    .single()
  
  if (empError) {
    console.log('   ❌ Employee 조회 실패:', empError.message)
  } else {
    console.log('   ✅ Employee 존재')
    console.log(`      - 이름: ${employee.name}`)
    console.log(`      - 역할: ${employee.role}`)
    console.log(`      - 활성화: ${employee.is_active}`)
    console.log(`      - Auth ID: ${employee.auth_user_id}`)
  }
  
  // 2. 로그인 테스트
  console.log('\n2️⃣ 로그인 테스트...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.log('   ❌ 로그인 실패:', error.message)
    console.log('\n💡 해결 방법:')
    console.log('   npx tsx scripts/reset-admin-password.ts')
  } else {
    console.log('   ✅ 로그인 성공!')
    console.log(`      - User ID: ${data.user?.id}`)
    console.log(`      - Email: ${data.user?.email}`)
    
    // 로그아웃
    await supabase.auth.signOut()
  }
  
  console.log('\n=====================================')
  console.log('📍 로그인 URL: http://10.20.200.21:3003/login')
  console.log('📧 이메일: admin@shiftlink.com')
  console.log('🔑 비밀번호: admin123')
  console.log('=====================================')
}

verifyLogin().catch(console.error)