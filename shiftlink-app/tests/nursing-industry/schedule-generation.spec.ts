import { test, expect } from '@playwright/test';
import { NursingTestHelpers } from '../helpers/nursing-test-helpers';
import { TEST_SCHEDULES, PERFORMANCE_BENCHMARKS } from '../fixtures/nursing-test-data';

test.describe('Phase 2: 스케줄 생성 및 자동화', () => {
  let helpers: NursingTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new NursingTestHelpers(page);
  });

  test.describe('TC021-030: 자동 스케줄 생성', () => {
    test('TC021: 1개월 스케줄 자동 생성 (30명, 28일)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      const result = await helpers.generateAndValidateSchedule({
        duration_days: TEST_SCHEDULES.MONTHLY.duration_days,
        start_date: TEST_SCHEDULES.MONTHLY.start_date,
        expected_violations: TEST_SCHEDULES.MONTHLY.expected_violations,
        performance_threshold: TEST_SCHEDULES.MONTHLY.performance_threshold_seconds
      });
      
      expect(result.generationTime).toBeLessThan(30);
      expect(result.violations).toBe(0);
    });

    test('TC022: 선호 패턴 반영률 검증 (80% 이상)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 스케줄 생성 후 선호 패턴 반영률 확인
      await helpers.generateAndValidateSchedule({
        duration_days: 14,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/pattern-compliance');
      
      // 전체 선호 패턴 반영률 확인
      const overallComplianceRate = await page.locator('[data-testid="overall-pattern-compliance"]').textContent();
      const compliancePercent = parseFloat(overallComplianceRate?.replace('%', '') || '0');
      expect(compliancePercent).toBeGreaterThan(80);
      
      // 개별 직원 선호 패턴 반영 확인
      const employeeRows = page.locator('[data-testid="employee-pattern-row"]');
      const rowCount = await employeeRows.count();
      
      let totalCompliance = 0;
      for (let i = 0; i < Math.min(rowCount, 10); i++) { // 처음 10명 검사
        const row = employeeRows.nth(i);
        const compliance = await row.locator('[data-testid="individual-compliance"]').textContent();
        totalCompliance += parseFloat(compliance?.replace('%', '') || '0');
      }
      
      const averageCompliance = totalCompliance / 10;
      expect(averageCompliance).toBeGreaterThan(75);
    });

    test('TC023: 공정성 점수 계산 및 검증 (편차 15% 이내)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 28,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/fairness');
      
      // 전체 공정성 점수 확인
      const fairnessScore = await page.locator('[data-testid="overall-fairness-score"]').textContent();
      const score = parseFloat(fairnessScore?.replace(/[^0-9.]/g, '') || '0');
      expect(score).toBeGreaterThan(85); // 85점 이상
      
      // 근무시간 편차 확인
      const workHoursDeviation = await page.locator('[data-testid="work-hours-deviation"]').textContent();
      const deviation = parseFloat(workHoursDeviation?.replace('%', '') || '0');
      expect(deviation).toBeLessThan(15);
      
      // 야간 근무 분배 공정성 확인
      const nightShiftFairness = await page.locator('[data-testid="night-shift-fairness"]').textContent();
      const nightFairness = parseFloat(nightShiftFairness?.replace('%', '') || '0');
      expect(nightFairness).toBeGreaterThan(80);
      
      // 주말 근무 분배 공정성 확인
      const weekendFairness = await page.locator('[data-testid="weekend-fairness"]').textContent();
      const weekendScore = parseFloat(weekendFairness?.replace('%', '') || '0');
      expect(weekendScore).toBeGreaterThan(80);
    });

    test('TC024: 위험 패턴 자동 회피 확인', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 21,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/dangerous-patterns');
      
      // 데이나오 패턴 발생 확인
      const dayNightOffCount = await page.locator('[data-testid="day-night-off-count"]').textContent();
      expect(parseInt(dayNightOffCount || '0')).toBe(0);
      
      // 기타 위험 패턴 확인
      const eveningNightDayCount = await page.locator('[data-testid="evening-night-day-count"]').textContent();
      expect(parseInt(eveningNightDayCount || '0')).toBe(0);
      
      const nightDayEveningCount = await page.locator('[data-testid="night-day-evening-count"]').textContent();
      expect(parseInt(nightDayEveningCount || '0')).toBe(0);
      
      // 연속 7일 근무 확인
      const sevenConsecutiveCount = await page.locator('[data-testid="seven-consecutive-count"]').textContent();
      expect(parseInt(sevenConsecutiveCount || '0')).toBe(0);
      
      // 위험 패턴 대안 제안 확인
      await expect(page.locator('[data-testid="pattern-alternatives"]')).toBeVisible();
    });

    test('TC025: 각 교대별 숙련도 균형 검증', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 14,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/skill-balance');
      
      // 각 교대별 숙련도 분포 확인
      const shifts = ['day', 'evening', 'night'];
      
      for (const shift of shifts) {
        const shiftSection = page.locator(`[data-testid="${shift}-shift-analysis"]`);
        
        // 각 교대에 시니어(expert) 최소 1명 배치 확인
        const expertCount = await shiftSection.locator('[data-testid="expert-count"]').textContent();
        expect(parseInt(expertCount || '0')).toBeGreaterThan(0);
        
        // 신규간호사는 데이 교대에만 배치 확인
        const beginnerCount = await shiftSection.locator('[data-testid="beginner-count"]').textContent();
        if (shift === 'day') {
          expect(parseInt(beginnerCount || '0')).toBeGreaterThanOrEqual(0);
        } else {
          expect(parseInt(beginnerCount || '0')).toBe(0); // 야간/이브닝에는 신규간호사 배치 안됨
        }
        
        // 중급자 비율 확인
        const intermediateRatio = await shiftSection.locator('[data-testid="intermediate-ratio"]').textContent();
        const ratio = parseFloat(intermediateRatio?.replace('%', '') || '0');
        expect(ratio).toBeGreaterThan(30);
      }
    });

    test('TC026: 연속 근무 제한 준수 확인', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 21,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/consecutive-work');
      
      // 연속 야간 근무 위반 확인
      const nightViolations = await page.locator('[data-testid="consecutive-night-violations"]').textContent();
      expect(parseInt(nightViolations || '0')).toBe(0);
      
      // 연속 근무일 위반 확인 (최대 7일)
      const workDayViolations = await page.locator('[data-testid="consecutive-workday-violations"]').textContent();
      expect(parseInt(workDayViolations || '0')).toBe(0);
      
      // 개별 직원 연속 근무 현황
      const employeeRows = page.locator('[data-testid="employee-consecutive-row"]');
      const rowCount = await employeeRows.count();
      
      for (let i = 0; i < Math.min(rowCount, 10); i++) {
        const row = employeeRows.nth(i);
        const maxConsecutiveNights = await row.locator('[data-testid="max-consecutive-nights"]').textContent();
        const maxConsecutiveDays = await row.locator('[data-testid="max-consecutive-days"]').textContent();
        
        expect(parseInt(maxConsecutiveNights || '0')).toBeLessThanOrEqual(5);
        expect(parseInt(maxConsecutiveDays || '0')).toBeLessThanOrEqual(7);
      }
    });

    test('TC027: 주말/공휴일 균등 배정 확인', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 28, // 4주간
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/weekend-distribution');
      
      // 주말 근무 분배 공정성 점수
      const weekendFairnessScore = await page.locator('[data-testid="weekend-fairness-score"]').textContent();
      const fairnessScore = parseFloat(weekendFairnessScore?.replace(/[^0-9.]/g, '') || '0');
      expect(fairnessScore).toBeGreaterThan(80);
      
      // 개별 직원 주말 근무 횟수 편차
      const employeeWeekendRows = page.locator('[data-testid="employee-weekend-row"]');
      const weekendCounts = [];
      
      for (let i = 0; i < Math.min(await employeeWeekendRows.count(), 15); i++) {
        const row = employeeWeekendRows.nth(i);
        const weekendCount = await row.locator('[data-testid="weekend-count"]').textContent();
        weekendCounts.push(parseInt(weekendCount || '0'));
      }
      
      const avgWeekends = weekendCounts.reduce((sum, count) => sum + count, 0) / weekendCounts.length;
      const maxDeviation = Math.max(...weekendCounts.map(count => Math.abs(count - avgWeekends)));
      expect(maxDeviation).toBeLessThan(2); // 2회 이내 편차
    });

    test('TC028: 생성 시간 성능 테스트 (30초 이내)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 성능 테스트 시나리오들
      const performanceTests = [
        { employees: 30, days: 28, maxSeconds: 30 },
        { employees: 30, days: 90, maxSeconds: 90 },
        { employees: 50, days: 28, maxSeconds: 60 }
      ];
      
      for (const testCase of performanceTests) {
        console.log(`성능 테스트: ${testCase.employees}명, ${testCase.days}일`);
        
        await page.goto('/schedules/generate');
        await page.fill('[data-testid="employee-count"]', testCase.employees.toString());
        await page.fill('[data-testid="duration-days"]', testCase.days.toString());
        
        const startTime = Date.now();
        await page.click('[data-testid="generate-schedule-button"]');
        
        // 생성 완료 대기
        await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ 
          timeout: testCase.maxSeconds * 1000 
        });
        
        const endTime = Date.now();
        const actualTime = (endTime - startTime) / 1000;
        
        console.log(`실제 생성 시간: ${actualTime}초`);
        expect(actualTime).toBeLessThan(testCase.maxSeconds);
      }
    });

    test('TC029: 스케줄 충돌률 검증 (2% 이하)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 28,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/conflicts');
      
      // 전체 충돌률 확인
      const overallConflictRate = await page.locator('[data-testid="overall-conflict-rate"]').textContent();
      const conflictPercent = parseFloat(overallConflictRate?.replace('%', '') || '0');
      expect(conflictPercent).toBeLessThan(2);
      
      // 충돌 유형별 확인
      const timeConflicts = await page.locator('[data-testid="time-conflicts"]').textContent();
      expect(parseInt(timeConflicts || '0')).toBe(0);
      
      const ruleConflicts = await page.locator('[data-testid="rule-conflicts"]').textContent();
      expect(parseInt(ruleConflicts || '0')).toBeLessThan(5);
      
      const staffingConflicts = await page.locator('[data-testid="staffing-conflicts"]').textContent();
      expect(parseInt(staffingConflicts || '0')).toBe(0);
      
      // 충돌 해결 제안 확인
      if (parseInt(ruleConflicts || '0') > 0) {
        await expect(page.locator('[data-testid="conflict-resolutions"]')).toBeVisible();
      }
    });

    test('TC030: 법적 규정 준수율 확인 (100%)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 28,
        start_date: '2024-01-01'
      });
      
      await page.goto('/schedules/analysis/legal-compliance');
      
      // 전체 법적 준수율 확인
      const overallCompliance = await page.locator('[data-testid="overall-legal-compliance"]').textContent();
      const compliancePercent = parseFloat(overallCompliance?.replace('%', '') || '0');
      expect(compliancePercent).toBe(100);
      
      // 세부 법규 준수 확인
      const laborLawCompliance = page.locator('[data-testid="labor-law-compliance"]');
      await expect(laborLawCompliance.locator('[data-testid="11-hour-rest-compliance"]')).toContainText('100%');
      await expect(laborLawCompliance.locator('[data-testid="52-hour-week-compliance"]')).toContainText('100%');
      await expect(laborLawCompliance.locator('[data-testid="night-work-compliance"]')).toContainText('100%');
      
      // 의료법 준수 확인
      const medicalLawCompliance = page.locator('[data-testid="medical-law-compliance"]');
      await expect(medicalLawCompliance.locator('[data-testid="minimum-staffing-compliance"]')).toContainText('100%');
      await expect(medicalLawCompliance.locator('[data-testid="skill-mix-compliance"]')).toContainText('100%');
    });
  });

  test.describe('TC031-035: 수동 조정 및 예외 처리', () => {
    test('TC031: 특정 직원 특정 날짜 수동 배정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 기본 스케줄 생성
      await helpers.generateAndValidateSchedule({
        duration_days: 7,
        start_date: '2024-01-01'
      });
      
      // 스케줄 수정 페이지로 이동
      await page.goto('/schedules/edit/current');
      
      // 특정 날짜 (2024-01-03) 데이 교대에 특정 직원 수동 배정
      const targetDate = '2024-01-03';
      const targetShift = 'day';
      const targetEmployee = '일반간호사1';
      
      await page.click(`[data-testid="cell-${targetDate}-${targetShift}"]`);
      await page.fill('[data-testid="employee-search"]', targetEmployee);
      await page.click(`[data-testid="employee-option-${targetEmployee}"]`);
      await page.click('[data-testid="assign-employee"]');
      
      // 배정 확인
      await expect(page.locator(`[data-testid="assignment-${targetDate}-${targetShift}-${targetEmployee}"]`)).toBeVisible();
      
      // 규칙 검증 실행
      await page.click('[data-testid="validate-assignment"]');
      
      // 위반 사항이 없다면 저장
      const violations = await page.locator('[data-testid="validation-violations"]').count();
      if (violations === 0) {
        await page.click('[data-testid="save-manual-assignment"]');
        await expect(page.locator('[data-testid="assignment-saved"]')).toBeVisible();
      }
    });

    test('TC032: 긴급 인력 변경 (갑작스런 병가)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 당일 긴급 상황 시뮬레이션
      await page.goto('/schedules/current');
      
      const today = new Date().toISOString().split('T')[0];
      const emergencyEmployee = '일반간호사2';
      
      // 당일 근무자 긴급 병가 처리
      await page.click(`[data-testid="employee-${emergencyEmployee}"]`);
      await page.click('[data-testid="emergency-sick-leave"]');
      await page.fill('[data-testid="sick-leave-reason"]', '급성 위장염');
      await page.click('[data-testid="confirm-sick-leave"]');
      
      // 대체 인력 자동 추천 확인
      await expect(page.locator('[data-testid="replacement-suggestions"]')).toBeVisible();
      
      const suggestionCount = await page.locator('[data-testid="replacement-option"]').count();
      expect(suggestionCount).toBeGreaterThan(0);
      
      // 첫 번째 추천 인력 선택
      await page.click('[data-testid="replacement-option"]').nth(0);
      await page.click('[data-testid="confirm-replacement"]');
      
      // 대체 배정 확인
      await expect(page.locator('[data-testid="replacement-confirmed"]')).toBeVisible();
      
      // 자동 알림 발송 확인
      await expect(page.locator('[data-testid="emergency-notification-sent"]')).toBeVisible();
    });

    test('TC033: 교대 시간 임시 변경 (수술 연장 등)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/current');
      
      // 수술 연장으로 인한 교대 시간 변경
      const surgicalNurse = '외과병동간호사1';
      
      await page.click(`[data-testid="employee-${surgicalNurse}"]`);
      await page.click('[data-testid="extend-shift"]');
      
      // 연장 사유 입력
      await page.selectOption('[data-testid="extension-reason"]', 'surgical_extension');
      await page.fill('[data-testid="extension-hours"]', '2'); // 2시간 연장
      await page.fill('[data-testid="extension-note"]', '응급 수술 연장으로 인한 근무 연장');
      
      // 연장 승인 (수간호사 권한)
      await page.click('[data-testid="approve-extension"]');
      
      // 다음 교대 근무자에게 자동 알림 확인
      await expect(page.locator('[data-testid="next-shift-notified"]')).toBeVisible();
      
      // 초과근무 시간 기록 확인
      await expect(page.locator('[data-testid="overtime-recorded"]')).toBeVisible();
      
      // 11시간 휴식 규칙 재계산 확인
      await expect(page.locator('[data-testid="rest-time-recalculated"]')).toBeVisible();
    });

    test('TC034: 추가 인력 배치 (환자 증가)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/current');
      
      // 환자 수 증가로 인한 추가 인력 필요
      await page.click('[data-testid="add-extra-staff"]');
      
      // 추가 인력 사유 선택
      await page.selectOption('[data-testid="extra-staff-reason"]', 'patient_surge');
      await page.fill('[data-testid="additional-count"]', '2'); // 2명 추가
      await page.selectOption('[data-testid="target-shift"]', 'night'); // 나이트 교대
      
      // 호출 가능한 대기 인력 목록 확인
      const onCallList = page.locator('[data-testid="on-call-staff-list"]');
      await expect(onCallList).toBeVisible();
      
      const availableStaff = await onCallList.locator('[data-testid="available-staff"]').count();
      expect(availableStaff).toBeGreaterThan(0);
      
      // 대기 인력 2명 선택
      await page.click('[data-testid="select-staff"]').nth(0);
      await page.click('[data-testid="select-staff"]').nth(1);
      
      // 호출 확인
      await page.click('[data-testid="call-additional-staff"]');
      
      // 호출 알림 발송 확인
      await expect(page.locator('[data-testid="call-notifications-sent"]')).toBeVisible();
      
      // 추가 근무 기록 확인
      await expect(page.locator('[data-testid="extra-shifts-recorded"]')).toBeVisible();
    });

    test('TC035: 예외 상황 감사 로그 기록 확인', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 예외 상황 발생 (긴급 교대 변경)
      await page.goto('/schedules/current');
      
      const targetEmployee = '중환자실간호사1';
      await page.click(`[data-testid="employee-${targetEmployee}"]`);
      await page.click('[data-testid="emergency-change"]');
      await page.fill('[data-testid="change-reason"]', '가족 응급상황');
      await page.click('[data-testid="confirm-emergency-change"]');
      
      // 감사 로그 확인
      await page.goto('/admin/audit-logs');
      
      // 최근 로그 확인
      const recentLogs = page.locator('[data-testid="recent-audit-log"]').first();
      await expect(recentLogs).toContainText('긴급 교대 변경');
      await expect(recentLogs).toContainText(targetEmployee);
      await expect(recentLogs).toContainText('가족 응급상황');
      
      // 로그 상세 정보 확인
      await recentLogs.click();
      const logDetail = page.locator('[data-testid="audit-log-detail"]');
      
      await expect(logDetail.locator('[data-testid="action-type"]')).toContainText('EMERGENCY_SHIFT_CHANGE');
      await expect(logDetail.locator('[data-testid="user-id"]')).toBeVisible();
      await expect(logDetail.locator('[data-testid="timestamp"]')).toBeVisible();
      await expect(logDetail.locator('[data-testid="ip-address"]')).toBeVisible();
      await expect(logDetail.locator('[data-testid="before-state"]')).toBeVisible();
      await expect(logDetail.locator('[data-testid="after-state"]')).toBeVisible();
      
      // 관련 알림 로그 확인
      await expect(logDetail.locator('[data-testid="related-notifications"]')).toBeVisible();
    });
  });

  test.describe('TC036-040: 시뮬레이션 및 최적화', () => {
    test('TC036: What-if 시뮬레이션 (인원 변경 시)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/simulation');
      
      // 현재 스케줄 로드
      await page.click('[data-testid="load-current-schedule"]');
      
      // What-if 시나리오 설정: 직원 1명 제외
      await page.click('[data-testid="what-if-scenario"]');
      await page.selectOption('[data-testid="scenario-type"]', 'remove_employee');
      await page.fill('[data-testid="employee-name"]', '일반간호사3');
      await page.fill('[data-testid="scenario-duration"]', '7'); // 7일간
      
      // 시뮬레이션 실행
      await page.click('[data-testid="run-simulation"]');
      
      // 시뮬레이션 결과 확인
      await expect(page.locator('[data-testid="simulation-results"]')).toBeVisible({ timeout: 30000 });
      
      // 영향도 분석 결과
      const impactAnalysis = page.locator('[data-testid="impact-analysis"]');
      await expect(impactAnalysis.locator('[data-testid="coverage-impact"]')).toBeVisible();
      await expect(impactAnalysis.locator('[data-testid="workload-impact"]')).toBeVisible();
      await expect(impactAnalysis.locator('[data-testid="overtime-impact"]')).toBeVisible();
      
      // 대안 스케줄 제안
      const alternatives = page.locator('[data-testid="alternative-schedules"]');
      const alternativeCount = await alternatives.locator('[data-testid="alternative-option"]').count();
      expect(alternativeCount).toBeGreaterThan(0);
      
      // 첫 번째 대안의 품질 점수 확인
      const qualityScore = await alternatives.locator('[data-testid="quality-score"]').first().textContent();
      expect(parseFloat(qualityScore || '0')).toBeGreaterThan(80);
    });

    test('TC037: 제약 조건 변경 시 재생성', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 기존 제약 조건으로 스케줄 생성
      await helpers.generateAndValidateSchedule({
        duration_days: 14,
        start_date: '2024-01-01'
      });
      
      const originalScheduleId = await page.locator('[data-testid="schedule-id"]').textContent();
      
      // 제약 조건 변경
      await page.goto('/settings/constraints');
      await page.fill('[data-testid="min-rest-hours"]', '12'); // 11시간 → 12시간
      await page.fill('[data-testid="max-consecutive-nights"]', '4'); // 5일 → 4일
      await page.click('[data-testid="save-constraints"]');
      
      // 변경된 제약 조건으로 재생성
      await page.goto('/schedules/regenerate');
      await page.selectOption('[data-testid="base-schedule"]', originalScheduleId || '');
      await page.check('[data-testid="apply-new-constraints"]');
      await page.click('[data-testid="regenerate-schedule"]');
      
      // 재생성 완료 대기
      await expect(page.locator('[data-testid="regeneration-complete"]')).toBeVisible({ timeout: 60000 });
      
      // 새 제약 조건 적용 확인
      await page.goto('/schedules/analysis/constraints-compliance');
      
      const restHoursCompliance = await page.locator('[data-testid="12-hour-rest-compliance"]').textContent();
      expect(restHoursCompliance).toContain('100%');
      
      const consecutiveNightsCompliance = await page.locator('[data-testid="4-night-limit-compliance"]').textContent();
      expect(consecutiveNightsCompliance).toContain('100%');
      
      // 변경 이력 확인
      await page.goto('/schedules/history');
      await expect(page.locator('[data-testid="regeneration-log"]')).toContainText('제약 조건 변경으로 인한 재생성');
    });

    test('TC038: 다중 시나리오 비교 기능', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/comparison');
      
      // 3가지 시나리오 생성
      const scenarios = [
        { name: '현재_설정', priority: 'balanced' },
        { name: '공정성_우선', priority: 'fairness' },
        { name: '효율성_우선', priority: 'efficiency' }
      ];
      
      for (const scenario of scenarios) {
        await page.click('[data-testid="add-scenario"]');
        await page.fill('[data-testid="scenario-name"]', scenario.name);
        await page.selectOption('[data-testid="optimization-priority"]', scenario.priority);
        await page.fill('[data-testid="scenario-duration"]', '14');
        await page.click('[data-testid="generate-scenario"]');
        
        // 각 시나리오 생성 완료 대기
        await expect(page.locator(`[data-testid="scenario-${scenario.name}-complete"]`)).toBeVisible({ timeout: 45000 });
      }
      
      // 시나리오 비교 결과 확인
      await page.click('[data-testid="compare-scenarios"]');
      
      const comparisonTable = page.locator('[data-testid="scenario-comparison-table"]');
      await expect(comparisonTable).toBeVisible();
      
      // 각 시나리오의 주요 지표 확인
      for (const scenario of scenarios) {
        const scenarioRow = comparisonTable.locator(`[data-testid="row-${scenario.name}"]`);
        
        // 공정성 점수
        const fairnessScore = await scenarioRow.locator('[data-testid="fairness-score"]').textContent();
        expect(parseFloat(fairnessScore || '0')).toBeGreaterThan(70);
        
        // 효율성 점수
        const efficiencyScore = await scenarioRow.locator('[data-testid="efficiency-score"]').textContent();
        expect(parseFloat(efficiencyScore || '0')).toBeGreaterThan(70);
        
        // 규칙 준수율
        const complianceRate = await scenarioRow.locator('[data-testid="compliance-rate"]').textContent();
        expect(parseFloat(complianceRate?.replace('%', '') || '0')).toBe(100);
      }
      
      // 추천 시나리오 표시 확인
      await expect(page.locator('[data-testid="recommended-scenario"]')).toBeVisible();
    });

    test('TC039: 최적화 알고리즘 성능 비교', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/algorithm-benchmark');
      
      // 다양한 알고리즘 성능 테스트
      const algorithms = ['genetic', 'simulated_annealing', 'greedy_heuristic'];
      const testResults = [];
      
      for (const algorithm of algorithms) {
        await page.selectOption('[data-testid="algorithm-type"]', algorithm);
        await page.fill('[data-testid="test-employees"]', '30');
        await page.fill('[data-testid="test-days"]', '28');
        
        const startTime = Date.now();
        await page.click('[data-testid="run-benchmark"]');
        
        // 완료 대기
        await expect(page.locator('[data-testid="benchmark-complete"]')).toBeVisible({ timeout: 120000 });
        
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;
        
        // 결과 수집
        const qualityScore = await page.locator('[data-testid="quality-score"]').textContent();
        const constraintViolations = await page.locator('[data-testid="constraint-violations"]').textContent();
        
        testResults.push({
          algorithm,
          executionTime,
          qualityScore: parseFloat(qualityScore || '0'),
          violations: parseInt(constraintViolations || '0')
        });
        
        console.log(`${algorithm}: ${executionTime}초, 품질: ${qualityScore}, 위반: ${constraintViolations}`);
      }
      
      // 성능 기준 검증
      testResults.forEach(result => {
        expect(result.executionTime).toBeLessThan(60); // 60초 내
        expect(result.qualityScore).toBeGreaterThan(85); // 85점 이상
        expect(result.violations).toBeLessThan(3); // 위반 3개 미만
      });
      
      // 최적 알고리즘 추천 확인
      await expect(page.locator('[data-testid="recommended-algorithm"]')).toBeVisible();
    });

    test('TC040: 시뮬레이션 결과 저장 및 롤백', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 현재 스케줄 백업
      await page.goto('/schedules/current');
      const currentScheduleId = await page.locator('[data-testid="schedule-id"]').textContent();
      
      await page.click('[data-testid="create-backup"]');
      await page.fill('[data-testid="backup-name"]', '시뮬레이션_전_백업');
      await page.click('[data-testid="confirm-backup"]');
      
      // 시뮬레이션 실행
      await page.goto('/schedules/simulation');
      await page.selectOption('[data-testid="simulation-type"]', 'optimization_test');
      await page.click('[data-testid="run-simulation"]');
      
      await expect(page.locator('[data-testid="simulation-complete"]')).toBeVisible({ timeout: 60000 });
      
      // 시뮬레이션 결과 저장
      await page.click('[data-testid="save-simulation-result"]');
      await page.fill('[data-testid="result-name"]', '최적화_테스트_결과');
      await page.fill('[data-testid="result-description"]', '공정성 우선 최적화 시뮬레이션 결과');
      await page.click('[data-testid="confirm-save-result"]');
      
      // 저장된 결과 목록 확인
      await page.goto('/schedules/saved-simulations');
      await expect(page.locator('[data-testid="simulation-최적화_테스트_결과"]')).toBeVisible();
      
      // 현재 스케줄에 적용
      await page.click('[data-testid="apply-simulation-최적화_테스트_결과"]');
      await page.click('[data-testid="confirm-apply"]');
      
      // 적용 확인
      await expect(page.locator('[data-testid="simulation-applied"]')).toBeVisible();
      
      // 롤백 테스트
      await page.goto('/schedules/backups');
      await page.click('[data-testid="backup-시뮬레이션_전_백업"]');
      await page.click('[data-testid="restore-backup"]');
      await page.click('[data-testid="confirm-restore"]');
      
      // 롤백 완료 확인
      await expect(page.locator('[data-testid="backup-restored"]')).toBeVisible();
      
      // 롤백 후 스케줄 ID 확인
      await page.goto('/schedules/current');
      const restoredScheduleId = await page.locator('[data-testid="schedule-id"]').textContent();
      expect(restoredScheduleId).toBe(currentScheduleId);
    });
  });

  test.describe('TC041-045: 스케줄 검증 및 품질 관리', () => {
    test('TC041: 자동 품질 검사 실행', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 21,
        start_date: '2024-01-01'
      });
      
      // 자동 품질 검사 실행
      await page.goto('/schedules/quality-check');
      await page.click('[data-testid="run-quality-check"]');
      
      // 품질 검사 완료 대기
      await expect(page.locator('[data-testid="quality-check-complete"]')).toBeVisible({ timeout: 30000 });
      
      // 품질 점수 확인
      const overallQualityScore = await page.locator('[data-testid="overall-quality-score"]').textContent();
      const qualityScore = parseFloat(overallQualityScore?.replace(/[^0-9.]/g, '') || '0');
      expect(qualityScore).toBeGreaterThan(85);
      
      // 세부 품질 지표 확인
      const qualityMetrics = page.locator('[data-testid="quality-metrics"]');
      
      const fairnessScore = await qualityMetrics.locator('[data-testid="fairness-metric"]').textContent();
      expect(parseFloat(fairnessScore || '0')).toBeGreaterThan(80);
      
      const efficiencyScore = await qualityMetrics.locator('[data-testid="efficiency-metric"]').textContent();
      expect(parseFloat(efficiencyScore || '0')).toBeGreaterThan(80);
      
      const complianceScore = await qualityMetrics.locator('[data-testid="compliance-metric"]').textContent();
      expect(parseFloat(complianceScore || '0')).toBe(100);
      
      const stabilityScore = await qualityMetrics.locator('[data-testid="stability-metric"]').textContent();
      expect(parseFloat(stabilityScore || '0')).toBeGreaterThan(85);
    });

    test('TC042: 규칙 위반 경고 알림', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 의도적으로 규칙 위반 상황 생성
      await page.goto('/schedules/edit/current');
      
      // 11시간 휴식 위반 시나리오
      const targetEmployee = '일반간호사4';
      await page.click(`[data-testid="employee-${targetEmployee}"]`);
      
      // 22:00 종료 후 다음날 06:00 시작 (8시간 휴식)
      await page.click('[data-testid="assign-night-shift"]'); // 22:00-06:00
      await page.click('[data-testid="next-day"]');
      await page.click('[data-testid="assign-day-shift"]'); // 06:00-14:00
      
      // 저장 시도
      await page.click('[data-testid="save-changes"]');
      
      // 규칙 위반 경고 확인
      const violationAlert = page.locator('[data-testid="rule-violation-alert"]');
      await expect(violationAlert).toBeVisible();
      await expect(violationAlert).toContainText('11시간 최소 휴식 위반');
      await expect(violationAlert).toContainText(targetEmployee);
      
      // 경고 상세 정보
      await violationAlert.locator('[data-testid="show-violation-details"]').click();
      const violationDetails = page.locator('[data-testid="violation-details"]');
      
      await expect(violationDetails.locator('[data-testid="violation-type"]')).toContainText('REST_TIME_VIOLATION');
      await expect(violationDetails.locator('[data-testid="current-rest-hours"]')).toContainText('8');
      await expect(violationDetails.locator('[data-testid="required-rest-hours"]')).toContainText('11');
      
      // 수정 제안 확인
      await expect(violationDetails.locator('[data-testid="suggested-fixes"]')).toBeVisible();
      
      // 강제 저장 옵션 확인 (권한에 따라)
      await expect(page.locator('[data-testid="force-save-option"]')).toBeVisible();
    });

    test('TC043: 개선 제안 생성 확인', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 14,
        start_date: '2024-01-01'
      });
      
      // AI 기반 개선 제안 요청
      await page.goto('/schedules/optimization-suggestions');
      await page.click('[data-testid="generate-suggestions"]');
      
      // 개선 제안 생성 완료 대기
      await expect(page.locator('[data-testid="suggestions-ready"]')).toBeVisible({ timeout: 45000 });
      
      // 제안 카테고리별 확인
      const suggestionCategories = page.locator('[data-testid="suggestion-categories"]');
      
      // 공정성 개선 제안
      const fairnessSuggestions = suggestionCategories.locator('[data-testid="fairness-suggestions"]');
      const fairnessSuggestionCount = await fairnessSuggestions.locator('[data-testid="suggestion-item"]').count();
      expect(fairnessSuggestionCount).toBeGreaterThan(0);
      
      // 효율성 개선 제안
      const efficiencySuggestions = suggestionCategories.locator('[data-testid="efficiency-suggestions"]');
      const efficiencySuggestionCount = await efficiencySuggestions.locator('[data-testid="suggestion-item"]').count();
      expect(efficiencySuggestionCount).toBeGreaterThan(0);
      
      // 건강 개선 제안
      const healthSuggestions = suggestionCategories.locator('[data-testid="health-suggestions"]');
      const healthSuggestionCount = await healthSuggestions.locator('[data-testid="suggestion-item"]').count();
      expect(healthSuggestionCount).toBeGreaterThan(0);
      
      // 제안의 영향도 분석 확인
      const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
      await expect(firstSuggestion.locator('[data-testid="impact-score"]')).toBeVisible();
      await expect(firstSuggestion.locator('[data-testid="implementation-difficulty"]')).toBeVisible();
      await expect(firstSuggestion.locator('[data-testid="affected-employees"]')).toBeVisible();
      
      // 제안 미리보기 기능
      await firstSuggestion.locator('[data-testid="preview-suggestion"]').click();
      await expect(page.locator('[data-testid="suggestion-preview"]')).toBeVisible();
    });

    test('TC044: 승인 전 최종 검토 시스템', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      await helpers.generateAndValidateSchedule({
        duration_days: 7,
        start_date: '2024-01-01'
      });
      
      // 스케줄 승인 프로세스 시작
      await page.goto('/schedules/approval');
      await page.click('[data-testid="request-approval"]');
      
      // 최종 검토 체크리스트 확인
      const reviewChecklist = page.locator('[data-testid="final-review-checklist"]');
      await expect(reviewChecklist).toBeVisible();
      
      // 필수 검토 항목들
      const checklistItems = [
        'legal-compliance-check',
        'staffing-adequacy-check',
        'dangerous-pattern-check',
        'fairness-distribution-check',
        'employee-preference-check'
      ];
      
      for (const item of checklistItems) {
        const checkItem = reviewChecklist.locator(`[data-testid="${item}"]`);
        await expect(checkItem).toBeVisible();
        
        // 자동 검증 결과 확인
        const status = await checkItem.locator('[data-testid="check-status"]').getAttribute('data-status');
        expect(status).toBe('passed');
        
        // 체크박스 선택
        await checkItem.locator('[data-testid="manual-review-confirm"]').check();
      }
      
      // 승인자 서명 영역
      await page.fill('[data-testid="approver-comments"]', '모든 규칙과 정책을 준수하여 승인합니다.');
      await page.click('[data-testid="digital-signature"]');
      
      // 최종 승인
      await page.click('[data-testid="final-approve-schedule"]');
      
      // 승인 완료 확인
      await expect(page.locator('[data-testid="schedule-approved"]')).toBeVisible();
      
      // 승인 이력 기록 확인
      await page.goto('/schedules/approval-history');
      const latestApproval = page.locator('[data-testid="approval-record"]').first();
      await expect(latestApproval.locator('[data-testid="approval-status"]')).toContainText('승인됨');
      await expect(latestApproval.locator('[data-testid="approver-name"]')).toContainText('수간호사1');
    });

    test('TC045: 배포 전 시뮬레이션 실행', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 승인된 스케줄의 배포 전 시뮬레이션
      await page.goto('/schedules/approved');
      const approvedSchedule = page.locator('[data-testid="approved-schedule"]').first();
      
      await approvedSchedule.locator('[data-testid="pre-deploy-simulation"]').click();
      
      // 시뮬레이션 범위 설정
      await page.selectOption('[data-testid="simulation-scope"]', 'full_impact');
      await page.check('[data-testid="include-notifications"]');
      await page.check('[data-testid="include-integrations"]');
      await page.check('[data-testid="include-performance-impact"]');
      
      // 시뮬레이션 실행
      await page.click('[data-testid="run-pre-deploy-simulation"]');
      
      // 시뮬레이션 완료 대기
      await expect(page.locator('[data-testid="pre-deploy-simulation-complete"]')).toBeVisible({ timeout: 60000 });
      
      // 시뮬레이션 결과 분석
      const simulationResults = page.locator('[data-testid="simulation-results"]');
      
      // 배포 영향도 분석
      const deploymentImpact = simulationResults.locator('[data-testid="deployment-impact"]');
      await expect(deploymentImpact.locator('[data-testid="affected-employees"]')).toBeVisible();
      await expect(deploymentImpact.locator('[data-testid="notification-volume"]')).toBeVisible();
      await expect(deploymentImpact.locator('[data-testid="system-load-estimate"]')).toBeVisible();
      
      // 예상 문제점 및 위험도
      const riskAssessment = simulationResults.locator('[data-testid="risk-assessment"]');
      const riskLevel = await riskAssessment.locator('[data-testid="overall-risk-level"]').textContent();
      expect(['낮음', '보통']).toContain(riskLevel);
      
      // 배포 권장사항
      const deploymentRecommendations = simulationResults.locator('[data-testid="deployment-recommendations"]');
      await expect(deploymentRecommendations).toBeVisible();
      
      // 시뮬레이션 성공 시 배포 승인
      if (riskLevel === '낮음') {
        await page.click('[data-testid="approve-for-deployment"]');
        await expect(page.locator('[data-testid="deployment-approved"]')).toBeVisible();
      }
    });
  });
});