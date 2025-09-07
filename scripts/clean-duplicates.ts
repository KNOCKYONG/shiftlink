import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

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

async function cleanDuplicates() {
  console.log('🧹 중복 Employee 레코드 정리')
  console.log('=====================================')
  
  const email = 'admin@shiftlink.com'
  
  // 1. 중복 확인
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ 조회 실패:', error.message)
    process.exit(1)
  }
  
  console.log(`\n📊 ${email} 레코드 수: ${employees?.length || 0}개`)
  
  if (!employees || employees.length === 0) {
    console.log('   ⚠️ Employee 레코드가 없습니다.')
    process.exit(0)
  }
  
  if (employees.length === 1) {
    console.log('   ✅ 중복 없음')
    console.log(`      - ID: ${employees[0].id}`)
    console.log(`      - 이름: ${employees[0].name}`)
    console.log(`      - Auth ID: ${employees[0].auth_user_id}`)
    process.exit(0)
  }
  
  // 2. 중복 레코드 처리
  console.log('\n🔍 중복 레코드 발견:')
  employees.forEach((emp, idx) => {
    console.log(`   ${idx + 1}. ID: ${emp.id}`)
    console.log(`      - 이름: ${emp.name}`)
    console.log(`      - Auth ID: ${emp.auth_user_id}`)
    console.log(`      - 생성일: ${emp.created_at}`)
  })
  
  // auth_user_id가 있는 레코드 우선
  const withAuthId = employees.find(e => e.auth_user_id)
  const keepRecord = withAuthId || employees[0]
  const deleteRecords = employees.filter(e => e.id !== keepRecord.id)
  
  console.log('\n✅ 유지할 레코드:')
  console.log(`   - ID: ${keepRecord.id}`)
  console.log(`   - Auth ID: ${keepRecord.auth_user_id}`)
  
  console.log('\n🗑️ 삭제할 레코드:')
  deleteRecords.forEach(emp => {
    console.log(`   - ID: ${emp.id}`)
  })
  
  // 3. 중복 삭제
  for (const emp of deleteRecords) {
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', emp.id)
    
    if (deleteError) {
      console.error(`   ❌ 삭제 실패 (${emp.id}):`, deleteError.message)
    } else {
      console.log(`   ✅ 삭제 완료 (${emp.id})`)
    }
  }
  
  console.log('\n=====================================')
  console.log('✅ 중복 정리 완료!')
}

cleanDuplicates().catch(console.error)