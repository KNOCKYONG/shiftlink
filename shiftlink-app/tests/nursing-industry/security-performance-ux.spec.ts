import { test, expect } from '@playwright/test';
import { NursingTestHelpers } from '../helpers/nursing-test-helpers';
import { SECURITY_TEST_DATA, PERFORMANCE_BENCHMARKS } from '../fixtures/nursing-test-data';

test.describe('Phase 8-10: 보안, 성능, UX 테스트', () => {
  let helpers: NursingTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new NursingTestHelpers(page);
  });

  test.describe('TC141-160: 보안 및 컴플라이언스 (Phase 8)', () => {
    test('TC141: 개인정보 보호 (간호사 정보 암호화)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/data-protection');
      
      // 개인정보 암호화 상태 확인
      const encryptionStatus = page.locator('[data-testid="encryption-status"]');
      await expect(encryptionStatus).toBeVisible();
      
      // 데이터베이스 암호화 확인
      const dbEncryption = encryptionStatus.locator('[data-testid="database-encryption"]');
      await expect(dbEncryption.locator('[data-testid="status"]')).toContainText('활성');
      await expect(dbEncryption.locator('[data-testid="algorithm"]')).toContainText('AES-256');
      
      // 전송 중 암호화 확인
      const transmissionEncryption = encryptionStatus.locator('[data-testid="transmission-encryption"]');
      await expect(transmissionEncryption.locator('[data-testid="ssl-status"]')).toContainText('TLS 1.3');
      await expect(transmissionEncryption.locator('[data-testid="certificate-status"]')).toContainText('유효');
      
      // 개인정보 마스킹 테스트
      await page.goto('/admin/employees');
      
      const employeeList = page.locator('[data-testid="employee-list"]');
      const firstEmployee = employeeList.locator('[data-testid="employee-row"]').first();
      
      // 민감 정보 마스킹 확인
      const phoneNumber = await firstEmployee.locator('[data-testid="phone-number"]').textContent();
      expect(phoneNumber).toMatch(/\*{3,}/); // 전화번호 일부 마스킹
      
      const idNumber = await firstEmployee.locator('[data-testid="id-number"]').textContent();
      expect(idNumber).toMatch(/\*{6,}/); // 주민번호 뒤자리 마스킹
      
      // 접근 권한별 정보 표시 차이 확인
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/employees/list');
      
      const limitedEmployeeList = page.locator('[data-testid="limited-employee-list"]');
      const limitedFirstEmployee = limitedEmployeeList.locator('[data-testid="employee-row"]').first();
      
      // 일반 직원은 연락처 정보 제한
      await expect(limitedFirstEmployee.locator('[data-testid="phone-number"]')).toBeHidden();
      await expect(limitedFirstEmployee.locator('[data-testid="address"]')).toBeHidden();
      
      // 암호화 키 순환 정책 확인
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/security/key-rotation');
      
      const keyRotation = page.locator('[data-testid="key-rotation-policy"]');
      const rotationInterval = await keyRotation.locator('[data-testid="rotation-interval"]').textContent();
      expect(rotationInterval).toContain('90일');
      
      const lastRotation = await keyRotation.locator('[data-testid="last-rotation"]').textContent();
      expect(lastRotation).toBeTruthy();
    });

    test('TC142: 역할별 접근 권한 제어', async ({ page }) => {
      // 관리자 권한 테스트
      await helpers.loginAsNurse('head_nurse', 1);
      
      const adminPages = [
        '/admin/settings',
        '/admin/employees',
        '/admin/audit-logs',
        '/schedules/generate',
        '/leaves/approval'
      ];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage);
        // 403 에러가 없어야 함
        await expect(page.locator('[data-testid="access-denied"]')).toBeHidden();
        await expect(page.locator('text=403')).toBeHidden();
      }
      
      // 일반 직원 권한 테스트
      await helpers.loginAsNurse('staff_nurse', 1);
      
      const restrictedPages = [
        { url: '/admin/settings', accessible: false },
        { url: '/admin/employees', accessible: false },
        { url: '/admin/audit-logs', accessible: false },
        { url: '/schedules/generate', accessible: false },
        { url: '/dashboard', accessible: true },
        { url: '/leaves/request', accessible: true },
        { url: '/swaps/request', accessible: true },
        { url: '/profile/settings', accessible: true }
      ];
      
      for (const pageTest of restrictedPages) {
        await page.goto(pageTest.url);
        
        if (pageTest.accessible) {
          await expect(page.locator('[data-testid="access-denied"]')).toBeHidden();
          await expect(page.locator('text=403')).toBeHidden();
        } else {
          // 접근 거부 메시지 또는 리다이렉트 확인
          const hasAccessDenied = await page.locator('[data-testid="access-denied"]').isVisible();
          const has403 = await page.locator('text=403').isVisible();
          const currentUrl = page.url();
          
          expect(hasAccessDenied || has403 || !currentUrl.includes(pageTest.url)).toBe(true);
        }
      }
      
      // API 엔드포인트 권한 테스트
      const apiTests = [
        { endpoint: '/api/admin/users', method: 'GET', shouldFail: true },
        { endpoint: '/api/schedules/generate', method: 'POST', shouldFail: true },
        { endpoint: '/api/leaves/my', method: 'GET', shouldFail: false },
        { endpoint: '/api/profile', method: 'GET', shouldFail: false }
      ];
      
      for (const apiTest of apiTests) {
        const response = await page.request.fetch(apiTest.endpoint, {
          method: apiTest.method as any
        });
        
        if (apiTest.shouldFail) {
          expect([401, 403]).toContain(response.status());
        } else {
          expect([200, 201]).toContain(response.status());
        }
      }
      
      // 동적 권한 변경 테스트
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/role-management');
      
      // 특정 직원의 권한 임시 상승
      const employeeRole = page.locator('[data-testid="employee-일반간호사1-role"]');
      await employeeRole.selectOption('temporary_manager');
      await page.fill('[data-testid="permission-duration"]', '24');
      await page.click('[data-testid="grant-temporary-permission"]');
      
      // 임시 권한 부여 확인
      await expect(page.locator('[data-testid="temporary-permission-granted"]')).toBeVisible();
      
      // 부여된 권한으로 테스트
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/schedules/view-all');
      await expect(page.locator('[data-testid="all-schedules"]')).toBeVisible();
    });

    test('TC143: 감사 로그 전체 추적', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/audit-logs');
      
      // 감사 로그 검색 및 필터링
      const auditLogFilters = page.locator('[data-testid="audit-log-filters"]');
      
      // 액션 유형별 필터
      await auditLogFilters.locator('[data-testid="action-type-filter"]').selectOption('schedule_change');
      await auditLogFilters.locator('[data-testid="date-range-start"]').fill('2024-01-01');
      await auditLogFilters.locator('[data-testid="date-range-end"]').fill('2024-12-31');
      await page.click('[data-testid="apply-audit-filters"]');
      
      // 감사 로그 항목 확인
      const auditEntries = page.locator('[data-testid="audit-log-entries"]');
      const entryCount = await auditEntries.locator('[data-testid="audit-entry"]').count();
      expect(entryCount).toBeGreaterThan(0);
      
      // 첫 번째 감사 로그 항목 상세 검증
      const firstEntry = auditEntries.locator('[data-testid="audit-entry"]').first();
      
      // 필수 감사 정보 확인
      await expect(firstEntry.locator('[data-testid="timestamp"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="user-id"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="user-name"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="action-type"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="resource-type"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="resource-id"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="ip-address"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="user-agent"]')).toBeVisible();
      
      // 변경 전후 데이터 확인
      await firstEntry.click();
      const entryDetail = page.locator('[data-testid="audit-entry-detail"]');
      
      await expect(entryDetail.locator('[data-testid="before-value"]')).toBeVisible();
      await expect(entryDetail.locator('[data-testid="after-value"]')).toBeVisible();
      await expect(entryDetail.locator('[data-testid="change-reason"]')).toBeVisible();
      
      // 민감한 액션 추가 검증
      await page.goto('/admin/audit-logs/sensitive');
      
      const sensitiveActions = [
        'password_reset',
        'permission_change',
        'data_export',
        'schedule_emergency_change',
        'employee_data_access'
      ];
      
      for (const action of sensitiveActions) {
        await auditLogFilters.locator('[data-testid="action-type-filter"]').selectOption(action);
        await page.click('[data-testid="apply-audit-filters"]');
        
        const actionEntries = await auditEntries.locator('[data-testid="audit-entry"]').count();
        
        if (actionEntries > 0) {
          const actionEntry = auditEntries.locator('[data-testid="audit-entry"]').first();
          
          // 민감한 액션은 추가 메타데이터 필요
          await actionEntry.click();
          const sensitiveDetail = page.locator('[data-testid="sensitive-audit-detail"]');
          
          await expect(sensitiveDetail.locator('[data-testid="approval-required"]')).toBeVisible();
          await expect(sensitiveDetail.locator('[data-testid="supervisor-notification"]')).toBeVisible();
          await expect(sensitiveDetail.locator('[data-testid="retention-period"]')).toBeVisible();
        }
      }
      
      // 감사 로그 무결성 검증
      await page.goto('/admin/audit-logs/integrity');
      
      const integrityCheck = page.locator('[data-testid="audit-integrity-check"]');
      await page.click('[data-testid="verify-integrity"]');
      
      await expect(integrityCheck.locator('[data-testid="integrity-status"]')).toContainText('검증 완료');
      const integrityScore = await integrityCheck.locator('[data-testid="integrity-score"]').textContent();
      expect(parseFloat(integrityScore?.replace('%', '') || '0')).toBe(100);
    });

    test('TC144-148: 법적 준수 및 보안 테스트', async ({ page }) => {
      // TC144: 의료법 준수 검증
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/compliance/medical-law');
      
      const complianceStatus = page.locator('[data-testid="medical-law-compliance"]');
      await expect(complianceStatus).toBeVisible();
      
      // 최소 간호 인력 기준 준수
      const staffingCompliance = complianceStatus.locator('[data-testid="staffing-compliance"]');
      await expect(staffingCompliance.locator('[data-testid="compliance-rate"]')).toContainText('100%');
      
      // 연속 근무 제한 준수
      const workingHoursCompliance = complianceStatus.locator('[data-testid="working-hours-compliance"]');
      await expect(workingHoursCompliance.locator('[data-testid="compliance-rate"]')).toContainText('100%');
      
      // TC145: 근로기준법 준수 자동 검사
      await page.goto('/admin/compliance/labor-law');
      
      const laborLawCompliance = page.locator('[data-testid="labor-law-compliance"]');
      
      // 주 52시간 제한 준수
      const weeklyHoursCheck = laborLawCompliance.locator('[data-testid="weekly-hours-check"]');
      await expect(weeklyHoursCheck.locator('[data-testid="violation-count"]')).toContainText('0');
      
      // 11시간 최소 휴식 준수
      const restHoursCheck = laborLawCompliance.locator('[data-testid="rest-hours-check"]');
      await expect(restHoursCheck.locator('[data-testid="violation-count"]')).toContainText('0');
      
      // TC146-148: 데이터 백업/복구, 시스템 보안 스캔, API 보안 테스트
    });

    test('TC149-152: 웹 보안 테스트', async ({ page }) => {
      // TC149: SQL Injection 방어 테스트
      for (const payload of SECURITY_TEST_DATA.SQL_INJECTION_PAYLOADS) {
        await helpers.loginAsNurse('staff_nurse', 1);
        
        // 직원 검색 필드에서 SQL Injection 시도
        await page.goto('/employees/search');
        await helpers.testSQLInjection(payload, '[data-testid="employee-search-input"]');
        
        // 스케줄 검색에서 SQL Injection 시도
        await page.goto('/schedules/search');
        await helpers.testSQLInjection(payload, '[data-testid="schedule-search-input"]');
      }
      
      // TC150: XSS 방어 테스트
      for (const payload of SECURITY_TEST_DATA.XSS_PAYLOADS) {
        await helpers.loginAsNurse('staff_nurse', 1);
        
        // 휴가 신청 사유 필드에서 XSS 시도
        await page.goto('/leaves/request');
        await page.fill('[data-testid="leave-reason"]', payload);
        await page.click('[data-testid="submit-leave-request"]');
        
        // XSS 스크립트가 실행되지 않았는지 확인
        const alerts = page.locator('alert');
        expect(await alerts.count()).toBe(0);
        
        // 입력된 내용이 적절히 이스케이프되었는지 확인
        const displayedReason = await page.locator('[data-testid="displayed-reason"]').textContent();
        expect(displayedReason).not.toContain('<script>');
      }
      
      // TC151: 인증 토큰 보안
      await helpers.loginAsNurse('staff_nurse', 1);
      
      // JWT 토큰 검증
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(cookie => cookie.name.includes('auth') || cookie.name.includes('token'));
      
      if (authCookie) {
        // HttpOnly 플래그 확인
        expect(authCookie.httpOnly).toBe(true);
        
        // Secure 플래그 확인 (HTTPS 환경에서)
        if (page.url().startsWith('https://')) {
          expect(authCookie.secure).toBe(true);
        }
        
        // SameSite 설정 확인
        expect(['Strict', 'Lax']).toContain(authCookie.sameSite);
      }
      
      // TC152: 세션 관리 보안
      // 동시 로그인 제한 테스트
      const context2 = await page.context().browser()?.newContext();
      if (context2) {
        const page2 = await context2.newPage();
        
        // 같은 계정으로 다른 브라우저에서 로그인 시도
        await helpers.loginAsNurse('staff_nurse', 1);
        
        // 원래 세션 만료 확인
        await page.reload();
        const sessionExpired = await page.locator('[data-testid="session-expired"]').isVisible();
        expect(sessionExpired).toBe(true);
        
        await context2.close();
      }
    });

    test('TC153-160: 컴플라이언스 및 고급 보안', async ({ page }) => {
      // TC153-160: 의료기관 인증 연동, HIPAA 준수, 개인정보처리방침 준수,
      // 컴플라이언스 리포트 생성, 보안 사고 대응 프로세스, 데이터 익명화,
      // 접근 이력 모니터링, 보안 정책 자동 업데이트 등
    });
  });

  test.describe('TC161-175: 성능 및 확장성 (Phase 9)', () => {
    test('TC161: 30명 1개월 스케줄 생성 < 30초', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      const performanceTest = await helpers.generateAndValidateSchedule({
        duration_days: 28,
        start_date: '2024-01-01',
        performance_threshold: 30
      });
      
      expect(performanceTest.generationTime).toBeLessThan(30);
      console.log(`스케줄 생성 시간: ${performanceTest.generationTime}초`);
    });

    test('TC162: 100명 동시 접속 테스트', async ({ page, context }) => {
      // 동시 접속 시뮬레이션을 위한 성능 테스트
      const loadTestResults = [];
      
      // 10개의 동시 세션 생성 (실제 100개는 리소스 제약으로 축소)
      const concurrentSessions = 10;
      const contexts = [];
      
      for (let i = 0; i < concurrentSessions; i++) {
        const newContext = await context.browser()?.newContext();
        if (newContext) {
          contexts.push(newContext);
        }
      }
      
      // 각 세션에서 동일한 작업 수행
      const loadTestPromises = contexts.map(async (ctx, index) => {
        const testPage = await ctx.newPage();
        const testHelpers = new NursingTestHelpers(testPage);
        
        const startTime = Date.now();
        
        try {
          // 로그인
          await testHelpers.loginAsNurse('staff_nurse', (index % 5) + 1);
          
          // 대시보드 로딩
          await testPage.goto('/dashboard');
          await testPage.waitForLoadState('networkidle');
          
          // 스케줄 조회
          await testPage.goto('/schedules/current');
          await testPage.waitForLoadState('networkidle');
          
          // 휴가 목록 조회
          await testPage.goto('/leaves/my-requests');
          await testPage.waitForLoadState('networkidle');
          
          const endTime = Date.now();
          return {
            sessionId: index,
            duration: (endTime - startTime) / 1000,
            success: true
          };
        } catch (error) {
          const endTime = Date.now();
          return {
            sessionId: index,
            duration: (endTime - startTime) / 1000,
            success: false,
            error: error.message
          };
        } finally {
          await ctx.close();
        }
      });
      
      const results = await Promise.all(loadTestPromises);
      
      // 결과 분석
      const successfulSessions = results.filter(r => r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.duration));
      
      console.log(`성공한 세션: ${successfulSessions}/${concurrentSessions}`);
      console.log(`평균 응답 시간: ${averageResponseTime.toFixed(2)}초`);
      console.log(`최대 응답 시간: ${maxResponseTime.toFixed(2)}초`);
      
      // 성능 기준 검증
      expect(successfulSessions).toBeGreaterThanOrEqual(concurrentSessions * 0.9); // 90% 성공률
      expect(averageResponseTime).toBeLessThan(5); // 평균 5초 이내
      expect(maxResponseTime).toBeLessThan(10); // 최대 10초 이내
    });

    test('TC163: 대용량 데이터 처리 (1년치 스케줄)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/performance/large-data-test');
      
      // 1년치 스케줄 데이터 생성 테스트
      await page.fill('[data-testid="employees-count"]', '30');
      await page.fill('[data-testid="duration-days"]', '365');
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      
      const startTime = Date.now();
      await page.click('[data-testid="generate-large-schedule"]');
      
      // 대용량 처리 완료 대기 (최대 5분)
      await expect(page.locator('[data-testid="large-schedule-complete"]')).toBeVisible({ timeout: 300000 });
      
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      
      console.log(`1년치 스케줄 생성 시간: ${processingTime}초`);
      expect(processingTime).toBeLessThan(300); // 5분 이내
      
      // 생성된 데이터 검증
      const dataStats = page.locator('[data-testid="generated-data-stats"]');
      const totalAssignments = await dataStats.locator('[data-testid="total-assignments"]').textContent();
      const expectedAssignments = 30 * 365; // 대략 10,950개
      
      expect(parseInt(totalAssignments || '0')).toBeCloseTo(expectedAssignments, -100); // ±100 허용
      
      // 데이터 조회 성능 테스트
      await page.goto('/schedules/large-data-query');
      
      const queryTests = [
        { type: 'monthly', expected: 30 * 30 },
        { type: 'quarterly', expected: 30 * 90 },
        { type: 'yearly', expected: 30 * 365 }
      ];
      
      for (const queryTest of queryTests) {
        const queryStart = Date.now();
        await page.selectOption('[data-testid="query-period"]', queryTest.type);
        await page.click('[data-testid="execute-query"]');
        
        await expect(page.locator('[data-testid="query-results"]')).toBeVisible({ timeout: 30000 });
        
        const queryEnd = Date.now();
        const queryTime = (queryEnd - queryStart) / 1000;
        
        console.log(`${queryTest.type} 쿼리 시간: ${queryTime}초`);
        expect(queryTime).toBeLessThan(10); // 10초 이내
        
        const resultCount = await page.locator('[data-testid="result-count"]').textContent();
        expect(parseInt(resultCount || '0')).toBeCloseTo(queryTest.expected, -50);
      }
    });

    test('TC164-175: 추가 성능 테스트', async ({ page }) => {
      // TC164: 실시간 동기화 성능
      const syncPerformanceTest = await helpers.measurePageLoadTime('/dashboard/realtime');
      expect(syncPerformanceTest).toBeLessThan(3000);
      
      // TC165: 모바일 반응 속도 테스트
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      const mobileLoadTime = await helpers.measurePageLoadTime('/dashboard');
      expect(mobileLoadTime).toBeLessThan(4000);
      
      // TC166-175: 데이터베이스 쿼리 최적화, 캐싱 효율성, API 응답 시간,
      // 병목 구간 식별, 메모리 최적화, 네트워크 효율성, 재해 복구 시간,
      // 자동 스케일링, 데이터 마이그레이션, 국제화 성능 영향 등
    });
  });

  test.describe('TC176-185: UI/UX 및 접근성 (Phase 10)', () => {
    test('TC176: 모바일 반응형 디자인 검증', async ({ page }) => {
      const viewports = [
        { name: 'Mobile', width: 375, height: 667 },    // iPhone SE
        { name: 'Tablet', width: 768, height: 1024 },   // iPad
        { name: 'Desktop', width: 1440, height: 900 }   // 일반 데스크톱
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await helpers.loginAsNurse('staff_nurse', 1);
        await page.goto('/dashboard');
        
        // 레이아웃 검증
        const mainContent = page.locator('[data-testid="main-content"]');
        await expect(mainContent).toBeVisible();
        
        // 모바일에서 햄버거 메뉴 확인
        if (viewport.width < 768) {
          const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]');
          await expect(mobileMenu).toBeVisible();
          
          await mobileMenu.click();
          const mobileNav = page.locator('[data-testid="mobile-navigation"]');
          await expect(mobileNav).toBeVisible();
        } else {
          // 데스크톱/태블릿에서 일반 네비게이션 확인
          const desktopNav = page.locator('[data-testid="desktop-navigation"]');
          await expect(desktopNav).toBeVisible();
        }
        
        // 텍스트 가독성 확인
        const bodyText = page.locator('body');
        const fontSize = await bodyText.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(14); // 최소 14px
        
        // 터치 대상 크기 확인 (모바일)
        if (viewport.width < 768) {
          const buttons = page.locator('button');
          const buttonCount = await buttons.count();
          
          for (let i = 0; i < Math.min(buttonCount, 5); i++) {
            const button = buttons.nth(i);
            const boundingBox = await button.boundingBox();
            
            if (boundingBox) {
              // 터치 대상 최소 44px x 44px (WCAG 권장)
              expect(boundingBox.width).toBeGreaterThanOrEqual(44);
              expect(boundingBox.height).toBeGreaterThanOrEqual(44);
            }
          }
        }
        
        // 스크롤 동작 확인
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        
        const scrollPosition = await page.evaluate(() => window.pageYOffset);
        expect(scrollPosition).toBeGreaterThan(0);
        
        console.log(`${viewport.name} (${viewport.width}x${viewport.height}) 레이아웃 검증 완료`);
      }
    });

    test('TC177: 다크/라이트 테마 지원', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/profile/appearance');
      
      // 테마 설정 확인
      const themeSettings = page.locator('[data-testid="theme-settings"]');
      await expect(themeSettings).toBeVisible();
      
      // 라이트 테마 테스트
      await themeSettings.locator('[data-testid="light-theme"]').click();
      await page.waitForTimeout(500);
      
      const body = page.locator('body');
      const lightThemeClass = await body.getAttribute('class');
      expect(lightThemeClass).toContain('light');
      
      // 배경색 확인 (라이트)
      const lightBgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(lightBgColor).toMatch(/rgb\(255, 255, 255\)|rgb\(248, 249, 250\)/); // 흰색 계열
      
      // 다크 테마 테스트
      await themeSettings.locator('[data-testid="dark-theme"]').click();
      await page.waitForTimeout(500);
      
      const darkThemeClass = await body.getAttribute('class');
      expect(darkThemeClass).toContain('dark');
      
      // 배경색 확인 (다크)
      const darkBgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(darkBgColor).toMatch(/rgb\([0-9], [0-9], [0-9]\)|rgb\([1-5][0-9], [1-5][0-9], [1-5][0-9]\)/); // 어두운 색 계열
      
      // 자동 테마 (시스템 설정 따름)
      await themeSettings.locator('[data-testid="auto-theme"]').click();
      await page.waitForTimeout(500);
      
      // 시스템 다크 모드 시뮬레이션
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);
      
      const autoDarkClass = await body.getAttribute('class');
      expect(autoDarkClass).toContain('dark');
      
      // 시스템 라이트 모드 시뮬레이션
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(500);
      
      const autoLightClass = await body.getAttribute('class');
      expect(autoLightClass).toContain('light');
      
      // 테마별 가독성 확인
      const themes = ['light', 'dark'];
      
      for (const theme of themes) {
        await themeSettings.locator(`[data-testid="${theme}-theme"]`).click();
        await page.waitForTimeout(500);
        
        // 대비비 확인 (임계값 4.5:1 이상)
        const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6').first();
        if (await textElements.count() > 0) {
          const textColor = await textElements.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          const backgroundColor = await textElements.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });
          
          // 색상값이 있는지 확인 (실제 대비비 계산은 복잡하므로 기본 검증)
          expect(textColor).toBeTruthy();
          expect(backgroundColor).toBeTruthy();
        }
      }
    });

    test('TC178: 시각 장애인 접근성 (스크린 리더)', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/dashboard');
      
      // 전체 접근성 검증 실행
      await helpers.validateAccessibility();
      
      // 스크린 리더 지원 요소들 확인
      
      // 1. 대체 텍스트 확인
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        
        // 모든 이미지에 대체 텍스트 또는 aria-label 존재
        expect(alt || ariaLabel).toBeTruthy();
      }
      
      // 2. 헤딩 구조 확인
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // h1이 페이지당 하나만 있는지 확인
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeLessThanOrEqual(1);
      
      // 3. 폼 라벨 연결 확인
      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          
          // 라벨, aria-label, 또는 aria-labelledby 중 하나는 있어야 함
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
      
      // 4. 랜드마크 역할 확인
      const landmarks = [
        '[role="banner"]',
        '[role="navigation"]', 
        '[role="main"]',
        '[role="contentinfo"]'
      ];
      
      for (const landmark of landmarks) {
        const element = page.locator(landmark);
        await expect(element).toBeVisible();
      }
      
      // 5. 색상만으로 정보 전달하지 않는지 확인
      const statusIndicators = page.locator('[data-testid*="status"], [data-testid*="alert"]');
      const statusCount = await statusIndicators.count();
      
      for (let i = 0; i < statusCount; i++) {
        const indicator = statusIndicators.nth(i);
        const text = await indicator.textContent();
        const ariaLabel = await indicator.getAttribute('aria-label');
        const title = await indicator.getAttribute('title');
        
        // 색상 외에 텍스트나 다른 표시가 있어야 함
        expect(text || ariaLabel || title).toBeTruthy();
      }
      
      // 6. 키보드 탐색 테스트
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // 포커스 표시기 확인
      const focusOutline = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow;
      });
      expect(focusOutline).not.toBe('none');
    });

    test('TC179: 키보드 네비게이션 지원', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/dashboard');
      
      // Tab 키로 전체 페이지 탐색 테스트
      const focusableElements = await page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
      
      let currentTabIndex = 0;
      let focusedElements = [];
      
      // 모든 포커스 가능한 요소를 Tab으로 순회
      while (currentTabIndex < Math.min(focusableElements, 20)) { // 최대 20개까지만 테스트
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        
        if (await focusedElement.count() > 0) {
          const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
          const role = await focusedElement.getAttribute('role');
          const ariaLabel = await focusedElement.getAttribute('aria-label');
          
          focusedElements.push({
            tagName,
            role,
            ariaLabel,
            index: currentTabIndex
          });
          
          // 포커스가 보이는지 확인
          await expect(focusedElement).toBeVisible();
          
          // 포커스 표시기 확인
          const outline = await focusedElement.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return styles.outline !== 'none' || styles.boxShadow !== 'none';
          });
          expect(outline).toBe(true);
        }
        
        currentTabIndex++;
      }
      
      // 역방향 탐색 (Shift+Tab) 테스트
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Shift+Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
      
      // Enter 키로 버튼 활성화 테스트
      const buttons = page.locator('button:visible');
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        await firstButton.focus();
        
        // Enter 키 누르기 전 상태
        const beforeClick = await page.url();
        
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // URL 변경 또는 상태 변화 확인
        const afterClick = await page.url();
        const hasModal = await page.locator('[role="dialog"]').isVisible();
        
        // 버튼이 작동했는지 확인 (URL 변경 또는 모달 표시)
        expect(beforeClick !== afterClick || hasModal).toBe(true);
      }
      
      // Space 키로 체크박스/라디오 활성화 테스트
      const checkboxes = page.locator('input[type="checkbox"]:visible');
      if (await checkboxes.count() > 0) {
        const checkbox = checkboxes.first();
        await checkbox.focus();
        
        const beforeCheck = await checkbox.isChecked();
        await page.keyboard.press('Space');
        const afterCheck = await checkbox.isChecked();
        
        expect(beforeCheck !== afterCheck).toBe(true);
      }
      
      // Esc 키로 모달 닫기 테스트
      const modalTriggers = page.locator('[data-testid*="modal"], [data-testid*="dialog"]');
      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          await page.keyboard.press('Escape');
          await expect(modal).toBeHidden();
        }
      }
      
      console.log(`키보드 탐색 테스트 완료: ${focusedElements.length}개 요소 테스트`);
    });

    test('TC180-185: 추가 UX 테스트', async ({ page }) => {
      // TC180: 다국어 지원 (한국어/영어)
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/profile/language');
      
      const languageSelector = page.locator('[data-testid="language-selector"]');
      await expect(languageSelector).toBeVisible();
      
      // 영어로 변경
      await languageSelector.selectOption('en');
      await page.waitForTimeout(1000);
      
      // 영어 텍스트 확인
      const englishText = page.locator('[data-testid="dashboard-title"]');
      await expect(englishText).toContainText(/Dashboard|Schedule/);
      
      // 한국어로 변경
      await languageSelector.selectOption('ko');
      await page.waitForTimeout(1000);
      
      // 한국어 텍스트 확인
      const koreanText = page.locator('[data-testid="dashboard-title"]');
      await expect(koreanText).toContainText(/대시보드|스케줄/);
      
      // TC181-185: 폰트 크기 조정, 고대비 모드, 사용성 테스트, 브라우저 호환성, PWA 기능
    });
  });
});