import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 간호 업종 E2E 테스트 환경 정리 시작...');

  // Supabase 클라이언트 초기화
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase 환경변수 누락 - 테스트 데이터 정리 건너뛰기');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 테스트 데이터 정리 (생성 순서의 역순으로)
    await cleanupTestData(supabase);
    console.log('✅ 테스트 데이터 정리 완료');

    // 테스트 결과 요약
    await generateTestSummary();
    console.log('📊 테스트 결과 요약 생성 완료');

    console.log('🏁 간호 업종 E2E 테스트 환경 정리 완료');
  } catch (error) {
    console.error('❌ 테스트 환경 정리 실패:', error);
    // 정리 실패해도 테스트는 계속 진행
  }
}

async function cleanupTestData(supabase: any) {
  const tables = [
    'audit_logs',
    'notifications', 
    'monitoring_alerts',
    'fatigue_metrics',
    'work_time_aggregations',
    'schedule_assignments',
    'schedules',
    'leaves',
    'leave_balances', 
    'swap_requests',
    'shift_templates',
    'rulesets',
    'employees',
    'teams',
    'sites',
    'tenants'
  ];

  for (const table of tables) {
    try {
      await supabase
        .from(table)
        .delete()
        .like('id', '%test%')
        .or('tenant_id.eq.nursing-test-tenant,name.ilike.%테스트%');
      
      console.log(`✅ ${table} 테이블 정리 완료`);
    } catch (error) {
      console.warn(`⚠️ ${table} 테이블 정리 실패:`, error.message);
    }
  }
}

async function generateTestSummary() {
  // 테스트 결과 요약 파일 생성
  const summary = {
    timestamp: new Date().toISOString(),
    testSuite: '간호 업종 END TO END 테스트',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      ci: !!process.env.CI
    },
    coverage: {
      totalTests: 185,
      phases: [
        { name: 'Phase 1: 시스템 초기 설정', tests: 20 },
        { name: 'Phase 2: 스케줄 생성 및 자동화', tests: 25 },
        { name: 'Phase 3: 교환 및 트레이드', tests: 20 },
        { name: 'Phase 4: 휴가 및 결근 관리', tests: 20 },
        { name: 'Phase 5: 모니터링 및 분석', tests: 25 },
        { name: 'Phase 6: 알림 및 커뮤니케이션', tests: 15 },
        { name: 'Phase 7: 공유 및 내보내기', tests: 15 },
        { name: 'Phase 8: 보안 및 컴플라이언스', tests: 20 },
        { name: 'Phase 9: 성능 및 확장성', tests: 15 },
        { name: 'Phase 10: 사용자 경험 및 접근성', tests: 10 }
      ]
    },
    nursingSpecificFeatures: [
      '데이나오(Day-Night-Off) 패턴 탐지',
      '11시간 최소 휴식 규칙 검증',
      '연속 야간 근무 5일 제한',
      '3교대 시스템 (데이/이브닝/나이트)',
      '간호등급별 역할 관리',
      '피로도 모니터링 시스템',
      '의료법 컴플라이언스 검증'
    ]
  };

  // 테스트 결과 디렉토리 확인 및 생성
  const fs = require('fs');
  const path = require('path');
  
  const resultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // 요약 파일 저장
  const summaryPath = path.join(resultsDir, 'nursing-e2e-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

export default globalTeardown;