import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
import { promisify } from 'util'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Supabase 관리자 클라이언트 생성 (서비스 롤 키 필요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = promisify(rl.question).bind(rl)

async function resetAdminPassword() {
  try {
    console.log('🔐 ShiftLink Admin 비밀번호 재설정')
    console.log('=====================================')
    
    // 새 비밀번호 입력 받기
    const newPassword = await question('새 비밀번호를 입력하세요 (최소 6자): ') as string
    
    if (newPassword.length < 6) {
      console.error('❌ 비밀번호는 최소 6자 이상이어야 합니다.')
      process.exit(1)
    }
    
    // 비밀번호 확인
    const confirmPassword = await question('비밀번호를 다시 입력하세요: ') as string
    
    if (newPassword !== confirmPassword) {
      console.error('❌ 비밀번호가 일치하지 않습니다.')
      process.exit(1)
    }
    
    console.log('\n⏳ 비밀번호 변경 중...')
    
    // 1. admin@shiftlink.com 사용자 찾기
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers({
      filter: 'email.eq.admin@shiftlink.com'
    })
    
    if (searchError) {
      console.error('❌ 사용자 검색 실패:', searchError.message)
      process.exit(1)
    }
    
    if (!users || users.users.length === 0) {
      console.error('❌ admin@shiftlink.com 계정을 찾을 수 없습니다.')
      console.log('💡 먼저 회원가입을 진행해주세요.')
      process.exit(1)
    }
    
    const adminUser = users.users[0]
    
    // 2. 비밀번호 업데이트
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ 비밀번호 변경 실패:', updateError.message)
      process.exit(1)
    }
    
    console.log('✅ 비밀번호가 성공적으로 변경되었습니다!')
    console.log('\n📋 변경된 계정 정보:')
    console.log('   이메일: admin@shiftlink.com')
    console.log('   새 비밀번호: ' + '*'.repeat(newPassword.length))
    
    
    console.log('\n🎉 이제 로그인 페이지에서 새 비밀번호로 로그인할 수 있습니다.')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// 스크립트 실행
resetAdminPassword()