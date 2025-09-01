import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalSetup(config: FullConfig) {
  console.log('🏥 간호 업종 E2E 테스트 환경 설정 시작...');

  // Supabase 클라이언트 초기화
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경변수 누락');
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 테스트 데이터베이스 초기화
    await initializeTestDatabase(supabase);
    console.log('✅ 테스트 데이터베이스 초기화 완료');

    // 간호 업종 테스트 데이터 생성
    await setupNursingTestData(supabase);
    console.log('✅ 간호 테스트 데이터 생성 완료');

    console.log('🎯 간호 업종 E2E 테스트 환경 준비 완료');
  } catch (error) {
    console.error('❌ 테스트 환경 설정 실패:', error);
    throw error;
  }
}

async function initializeTestDatabase(supabase: any) {
  // 기존 테스트 데이터 정리
  const tables = [
    'schedule_assignments',
    'schedules', 
    'leaves',
    'swap_requests',
    'employees',
    'teams',
    'sites',
    'tenants'
  ];

  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 더미 조건으로 전체 삭제
  }
}

async function setupNursingTestData(supabase: any) {
  // 1. 테넌트 생성 (종합병원)
  const { data: tenant } = await supabase
    .from('tenants')
    .insert({
      id: 'nursing-test-tenant',
      name: '서울종합병원',
      domain: 'seoul-hospital',
      industry_type: 'healthcare_nursing',
      settings: {
        timezone: 'Asia/Seoul',
        shift_patterns: {
          day: { start: '06:00', end: '14:00' },
          evening: { start: '14:00', end: '22:00' },
          night: { start: '22:00', end: '06:00' }
        },
        minimum_rest_hours: 11,
        max_consecutive_nights: 5,
        allow_dangerous_patterns: false,
        enable_fatigue_monitoring: true
      }
    })
    .select()
    .single();

  // 2. 사업장 생성
  const { data: site } = await supabase
    .from('sites')
    .insert({
      tenant_id: tenant.id,
      name: '본원',
      address: '서울시 강남구',
      is_main: true
    })
    .select()
    .single();

  // 3. 팀 생성 (병동별)
  const teams = [
    { name: '내과병동', description: '내과 일반병동' },
    { name: '외과병동', description: '외과 일반병동' },
    { name: '중환자실', description: '집중치료실' },
    { name: '응급실', description: '응급의료센터' }
  ];

  const createdTeams = [];
  for (const team of teams) {
    const { data: createdTeam } = await supabase
      .from('teams')
      .insert({
        tenant_id: tenant.id,
        site_id: site.id,
        name: team.name,
        description: team.description,
        min_required_per_shift: 3
      })
      .select()
      .single();
    createdTeams.push(createdTeam);
  }

  // 4. 간호사 직원 생성 (30명)
  const nurseRoles = [
    { role: 'head_nurse', count: 2, korean_name: '수간호사' },
    { role: 'charge_nurse', count: 4, korean_name: '책임간호사' },
    { role: 'staff_nurse', count: 20, korean_name: '일반간호사' },
    { role: 'new_nurse', count: 4, korean_name: '신규간호사' }
  ];

  let employeeIndex = 1;
  for (const roleInfo of nurseRoles) {
    for (let i = 0; i < roleInfo.count; i++) {
      const teamIndex = employeeIndex % createdTeams.length;
      await supabase
        .from('employees')
        .insert({
          tenant_id: tenant.id,
          team_id: createdTeams[teamIndex].id,
          employee_number: `N${employeeIndex.toString().padStart(3, '0')}`,
          name: `${roleInfo.korean_name}${i + 1}`,
          email: `nurse${employeeIndex}@hospital.com`,
          role: roleInfo.role === 'head_nurse' ? 'manager' : 'employee',
          position: roleInfo.korean_name,
          hire_date: new Date(2020 + (employeeIndex % 4), 0, 1).toISOString().split('T')[0],
          is_active: true,
          experience_years: roleInfo.role === 'new_nurse' ? 0 : Math.floor(Math.random() * 15) + 1,
          skill_level: roleInfo.role === 'new_nurse' ? 'beginner' : 
                      roleInfo.role === 'staff_nurse' ? 'intermediate' : 'expert'
        });
      employeeIndex++;
    }
  }

  // 5. 교대 템플릿 생성
  const shiftTypes = ['day', 'evening', 'night'];
  for (const shiftType of shiftTypes) {
    await supabase
      .from('shift_templates')
      .insert({
        tenant_id: tenant.id,
        name: `${shiftType === 'day' ? '데이' : shiftType === 'evening' ? '이브닝' : '나이트'}`,
        type: shiftType,
        start_time: tenant.settings.shift_patterns[shiftType].start,
        end_time: tenant.settings.shift_patterns[shiftType].end,
        required_count: 3,
        is_active: true
      });
  }

  // 6. 기본 제약 조건 설정
  const constraints = [
    { name: 'min_rest_hours', value: 11, description: '최소 휴식시간' },
    { name: 'max_weekly_hours', value: 52, description: '주 최대 근무시간' },
    { name: 'max_consecutive_nights', value: 5, description: '연속 야간 최대일' },
    { name: 'min_staff_per_shift', value: 3, description: '교대당 최소 인원' }
  ];

  for (const constraint of constraints) {
    await supabase
      .from('rulesets')
      .insert({
        tenant_id: tenant.id,
        rule_name: constraint.name,
        rule_type: 'working_hours',
        rule_value: constraint.value,
        description: constraint.description,
        is_active: true,
        created_by: 'system'
      });
  }
}

export default globalSetup;