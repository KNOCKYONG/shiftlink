import { signInWithPassword } from '../lib/auth/auth-config'

async function testLogin() {
  console.log('🔐 최종 로그인 테스트')
  console.log('=====================================')
  
  const email = 'admin@shiftlink.com'
  const password = 'admin123'
  
  console.log(`이메일: ${email}`)
  console.log('로그인 시도 중...\n')
  
  const result = await signInWithPassword(email, password)
  
  if (result.success) {
    console.log('✅ 로그인 성공!')
    console.log('   - User ID:', result.data?.user?.id)
    console.log('   - Email:', result.data?.user?.email)
    console.log('   - Session:', result.data?.session ? 'Created' : 'No session')
    console.log('\n🎉 admin@shiftlink.com 계정으로 로그인 가능합니다!')
    console.log('   URL: http://10.20.200.21:3003/login')
  } else {
    console.log('❌ 로그인 실패:', result.error)
    console.log('\n💡 해결 방법:')
    console.log('   1. 비밀번호 재설정: npx tsx scripts/reset-admin-password.ts')
    console.log('   2. 계정 초기화: npx tsx scripts/quick-init-admin.ts')
  }
  
  process.exit(0)
}

testLogin().catch(console.error)