// Supabase 직접 연결 설정 스크립트
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 환경변수에서 읽기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 환경변수 확인:');
console.log('URL:', supabaseUrl ? '✅' : '❌');
console.log('Anon Key:', supabaseAnonKey ? '✅' : '❌');
console.log('Service Key:', supabaseServiceKey ? '✅' : '❌');

// Service Role 클라이언트 생성 (전체 권한)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('\n🚀 데이터베이스 설정 시작...\n');
  
  try {
    // 1. tenants 테이블 확인/생성
    console.log('1️⃣ tenants 테이블 확인...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (tenantsError && tenantsError.code === '42P01') {
      console.log('   ❌ tenants 테이블이 없습니다.');
      console.log('   📝 SQL Editor에서 complete_setup.sql을 실행해주세요.');
      return;
    }
    
    console.log('   ✅ tenants 테이블 존재');
    
    // 2. 테스트 데이터 확인
    console.log('\n2️⃣ 테스트 데이터 확인...');
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('name', '서울대학교병원')
      .single();
    
    if (existingTenant) {
      console.log('   ✅ 서울대학교병원 데이터가 이미 존재합니다.');
      
      // 직원 수 확인
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', existingTenant.id);
      
      console.log(`   👥 직원 수: ${count}명`);
      
      if (count > 0) {
        console.log('\n✨ 설정이 이미 완료되었습니다!');
        console.log('\n📌 다음 단계:');
        console.log('1. npm run dev 실행');
        console.log('2. http://localhost:3000 접속');
        console.log('3. admin@shiftlink.com / admin123!@# 로그인');
        return;
      }
    }
    
    // 3. 데이터 생성
    console.log('\n3️⃣ 테스트 데이터 생성...');
    
    // 테넌트 생성
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: '서울대학교병원' })
      .select()
      .single();
    
    if (tenantError) {
      console.log('   ❌ 테넌트 생성 실패:', tenantError.message);
      return;
    }
    
    console.log('   ✅ 테넌트 생성 완료');
    
    // 사이트 생성
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        tenant_id: newTenant.id,
        name: '본원',
        address: '서울특별시 종로구 대학로 101'
      })
      .select()
      .single();
    
    if (siteError) {
      console.log('   ❌ 사이트 생성 실패:', siteError.message);
      return;
    }
    
    console.log('   ✅ 사이트 생성 완료');
    
    // 팀 생성
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        tenant_id: newTenant.id,
        site_id: site.id,
        name: '중환자실 간호팀'
      })
      .select()
      .single();
    
    if (teamError) {
      console.log('   ❌ 팀 생성 실패:', teamError.message);
      return;
    }
    
    console.log('   ✅ 팀 생성 완료');
    
    // 관리자 직원 생성
    const { data: admin, error: adminError } = await supabase
      .from('employees')
      .insert({
        tenant_id: newTenant.id,
        team_id: team.id,
        name: '김관리',
        email: 'admin@shiftlink.com',
        role: 'admin',
        hierarchy_level: 1,
        status: 'active',
        hire_date: '2020-01-01'
      })
      .select()
      .single();
    
    if (adminError) {
      console.log('   ❌ 관리자 생성 실패:', adminError.message);
      return;
    }
    
    console.log('   ✅ 관리자 직원 생성 완료');
    
    console.log('\n✨ 기본 설정 완료!');
    console.log('\n📌 다음 단계:');
    console.log('1. Supabase Authentication에서 admin@shiftlink.com 계정 생성');
    console.log('2. 생성된 User ID를 복사');
    console.log('3. SQL Editor에서 실행:');
    console.log(`   UPDATE employees SET id = 'USER-ID' WHERE email = 'admin@shiftlink.com';`);
    console.log('4. npm run dev 실행');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
setupDatabase();