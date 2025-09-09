// Supabase MCP 테스트 스크립트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://igofcukuimzljtjaxfda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnb2ZjdWt1aW16bGp0amF4ZmRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY4NTc3MywiZXhwIjoyMDcyMjYxNzczfQ.8-W4gYyxFzOk1Dy3H3YwzFXKjrqsI1Q3xYvCwqTJaXY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔄 Supabase 연결 테스트 시작...');
  
  try {
    // 테이블 목록 조회
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ 연결 실패:', error.message);
      console.log('📝 tenants 테이블이 없을 수 있습니다. 테이블을 생성합니다...');
      return false;
    }
    
    console.log('✅ Supabase 연결 성공!');
    console.log('📊 tenants 테이블 존재 확인');
    return true;
  } catch (err) {
    console.error('❌ 오류:', err);
    return false;
  }
}

async function createTables() {
  console.log('\n🔨 테이블 생성 시작...');
  
  const createTableSQL = `
    -- tenants 테이블
    CREATE TABLE IF NOT EXISTS tenants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query: createTableSQL });
  
  if (error) {
    console.log('⚠️ RPC 방식이 작동하지 않습니다.');
    console.log('📝 SQL Editor에서 직접 실행해주세요.');
  } else {
    console.log('✅ 테이블 생성 완료!');
  }
}

async function main() {
  const connected = await testConnection();
  
  if (!connected) {
    await createTables();
  }
  
  console.log('\n📌 다음 단계:');
  console.log('1. Supabase SQL Editor에서 complete_setup.sql 실행');
  console.log('2. Authentication에서 admin@shiftlink.com 계정 생성');
  console.log('3. npm run dev로 애플리케이션 실행');
}

main();