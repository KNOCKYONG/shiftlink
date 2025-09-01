import { test, expect } from '@playwright/test';
import { NursingTestHelpers } from '../helpers/nursing-test-helpers';
import { NURSING_TENANT_DATA, NURSING_TEAMS, SHIFT_CONSTRAINTS } from '../fixtures/nursing-test-data';

test.describe('Phase 1: 시스템 초기 설정 및 업종 구성', () => {
  let helpers: NursingTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new NursingTestHelpers(page);
  });

  test.describe('TC001-005: 테넌트 및 업종 설정', () => {
    test('TC001: 새 테넌트 생성 시 업종을 healthcare_nursing으로 설정', async ({ page }) => {
      // 관리자로 로그인
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 테넌트 설정 페이지로 이동
      await page.goto('/admin/tenant/setup');
      
      // 업종 선택
      await page.selectOption('[data-testid="industry-type"]', 'healthcare_nursing');
      await page.fill('[data-testid="tenant-name"]', NURSING_TENANT_DATA.name);
      await page.fill('[data-testid="domain"]', NURSING_TENANT_DATA.domain);
      
      // 저장
      await page.click('[data-testid="save-tenant-button"]');
      
      // 성공 메시지 확인
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // 업종 설정 확인
      await page.reload();
      const industryType = await page.locator('[data-testid="industry-type"]').inputValue();
      expect(industryType).toBe('healthcare_nursing');
    });

    test('TC002: 간호 업종 전용 제약 조건 자동 로딩', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/settings/constraints');
      
      // 11시간 최소 휴식 규칙 확인
      const minRestHours = await page.locator('[data-testid="min-rest-hours"]').inputValue();
      expect(parseInt(minRestHours)).toBe(SHIFT_CONSTRAINTS.MIN_REST_HOURS);
      
      // 연속 야간 제한 확인
      const maxConsecutiveNights = await page.locator('[data-testid="max-consecutive-nights"]').inputValue();
      expect(parseInt(maxConsecutiveNights)).toBe(SHIFT_CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS);
      
      // 주 52시간 제한 확인
      const maxWeeklyHours = await page.locator('[data-testid="max-weekly-hours"]').inputValue();
      expect(parseInt(maxWeeklyHours)).toBe(SHIFT_CONSTRAINTS.MAX_WEEKLY_HOURS);
      
      // 데이나오 패턴 탐지 활성화 확인
      const dangerousPatternDetection = page.locator('[data-testid="dangerous-pattern-detection"]');
      await expect(dangerousPatternDetection).toBeChecked();
    });

    test('TC003: 3교대 템플릿 자동 생성', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/settings/shift-templates');
      
      // 데이 교대 확인
      await expect(page.locator('[data-testid="shift-day"]')).toBeVisible();
      const dayStart = await page.locator('[data-testid="day-start-time"]').inputValue();
      const dayEnd = await page.locator('[data-testid="day-end-time"]').inputValue();
      expect(dayStart).toBe('06:00');
      expect(dayEnd).toBe('14:00');
      
      // 이브닝 교대 확인
      await expect(page.locator('[data-testid="shift-evening"]')).toBeVisible();
      const eveningStart = await page.locator('[data-testid="evening-start-time"]').inputValue();
      const eveningEnd = await page.locator('[data-testid="evening-end-time"]').inputValue();
      expect(eveningStart).toBe('14:00');
      expect(eveningEnd).toBe('22:00');
      
      // 나이트 교대 확인
      await expect(page.locator('[data-testid="shift-night"]')).toBeVisible();
      const nightStart = await page.locator('[data-testid="night-start-time"]').inputValue();
      const nightEnd = await page.locator('[data-testid="night-end-time"]').inputValue();
      expect(nightStart).toBe('22:00');
      expect(nightEnd).toBe('06:00');
    });

    test('TC004: 위험 패턴 탐지 규칙 활성화', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/settings/dangerous-patterns');
      
      // 데이나오 패턴 탐지 활성화 확인
      const dayNightOffDetection = page.locator('[data-testid="day-night-off-detection"]');
      await expect(dayNightOffDetection).toBeChecked();
      
      // 연속 야간 후 즉시 데이 근무 탐지 확인
      const consecutiveNightsToDayDetection = page.locator('[data-testid="consecutive-nights-to-day-detection"]');
      await expect(consecutiveNightsToDayDetection).toBeChecked();
      
      // 위험 패턴 목록 확인
      const patternList = page.locator('[data-testid="dangerous-patterns-list"]');
      await expect(patternList.locator('text=데이→나이트→오프')).toBeVisible();
      await expect(patternList.locator('text=이브닝→나이트→데이')).toBeVisible();
      await expect(patternList.locator('text=7일 연속 근무')).toBeVisible();
    });

    test('TC005: 간호 등급별 조직 구조 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/settings/organization');
      
      // 조직 계층 구조 확인
      await expect(page.locator('[data-testid="role-head-nurse"]')).toBeVisible();
      await expect(page.locator('[data-testid="role-charge-nurse"]')).toBeVisible();
      await expect(page.locator('[data-testid="role-staff-nurse"]')).toBeVisible();
      await expect(page.locator('[data-testid="role-new-nurse"]')).toBeVisible();
      
      // 각 역할별 권한 확인
      const headNursePermissions = page.locator('[data-testid="head-nurse-permissions"]');
      await expect(headNursePermissions.locator('text=스케줄 생성')).toBeVisible();
      await expect(headNursePermissions.locator('text=직원 관리')).toBeVisible();
      await expect(headNursePermissions.locator('text=휴가 승인')).toBeVisible();
      
      // 신규간호사 제약 조건 확인
      const newNurseConstraints = page.locator('[data-testid="new-nurse-constraints"]');
      await expect(newNurseConstraints.locator('text=야간 근무 제한')).toBeVisible();
      await expect(newNurseConstraints.locator('text=프리셉터 필요')).toBeVisible();
    });
  });

  test.describe('TC006-010: 직원 등록 및 권한 설정', () => {
    test('TC006: 각 등급별 직원 등록 (30명)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/employees');
      
      // 전체 직원 수 확인 (30명)
      const employeeCount = await page.locator('[data-testid="employee-count"]').textContent();
      expect(parseInt(employeeCount || '0')).toBe(30);
      
      // 역할별 직원 수 확인
      const headNurseCount = await page.locator('[data-testid="head-nurse-count"]').textContent();
      expect(parseInt(headNurseCount || '0')).toBe(2);
      
      const chargeNurseCount = await page.locator('[data-testid="charge-nurse-count"]').textContent();
      expect(parseInt(chargeNurseCount || '0')).toBe(4);
      
      const staffNurseCount = await page.locator('[data-testid="staff-nurse-count"]').textContent();
      expect(parseInt(staffNurseCount || '0')).toBe(20);
      
      const newNurseCount = await page.locator('[data-testid="new-nurse-count"]').textContent();
      expect(parseInt(newNurseCount || '0')).toBe(4);
    });

    test('TC007: 역할별 권한 할당', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/roles');
      
      // 관리자 권한 (수간호사) 확인
      const managerRole = page.locator('[data-testid="manager-role"]');
      await expect(managerRole.locator('[data-testid="permission-schedule-create"]')).toBeChecked();
      await expect(managerRole.locator('[data-testid="permission-employee-manage"]')).toBeChecked();
      await expect(managerRole.locator('[data-testid="permission-leave-approve"]')).toBeChecked();
      
      // 직원 권한 확인
      const employeeRole = page.locator('[data-testid="employee-role"]');
      await expect(employeeRole.locator('[data-testid="permission-schedule-view"]')).toBeChecked();
      await expect(employeeRole.locator('[data-testid="permission-leave-request"]')).toBeChecked();
      await expect(employeeRole.locator('[data-testid="permission-swap-request"]')).toBeChecked();
    });

    test('TC008: 개인별 제약 사항 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 특정 간호사의 제약 사항 설정 테스트
      await page.goto('/admin/employees/staff-nurse-1/constraints');
      
      // 야간 근무 불가 설정
      await page.check('[data-testid="no-night-shifts"]');
      
      // 특정 요일 고정 근무 설정 (예: 화요일 데이 근무)
      await page.selectOption('[data-testid="fixed-day-of-week"]', '2'); // 화요일
      await page.selectOption('[data-testid="fixed-shift-type"]', 'day');
      
      // 육아로 인한 이브닝 근무 제한
      await page.check('[data-testid="childcare-constraint"]');
      
      // 저장
      await page.click('[data-testid="save-constraints"]');
      
      // 저장 확인
      await expect(page.locator('[data-testid="constraints-saved"]')).toBeVisible();
    });

    test('TC009: 선호 패턴 설정', async ({ page }) => {
      await helpers.loginAsNurse('charge_nurse', 1);
      await page.goto('/profile/preferences');
      
      // 선호 패턴 설정 (데이→이브닝→나이트→오프)
      await page.selectOption('[data-testid="preference-1"]', 'day');
      await page.selectOption('[data-testid="preference-2"]', 'evening');
      await page.selectOption('[data-testid="preference-3"]', 'night');
      await page.selectOption('[data-testid="preference-4"]', 'off');
      
      // 우선순위 설정
      await page.selectOption('[data-testid="pattern-priority"]', 'high');
      
      // 저장
      await page.click('[data-testid="save-preferences"]');
      
      // 저장 확인
      await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
      
      // 설정 확인
      await page.reload();
      const pref1 = await page.locator('[data-testid="preference-1"]').inputValue();
      expect(pref1).toBe('day');
    });

    test('TC010: 휴가 잔액 초기 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/leave-balances');
      
      // 전체 직원의 휴가 잔액 확인
      const employeeRows = page.locator('[data-testid="employee-balance-row"]');
      const rowCount = await employeeRows.count();
      expect(rowCount).toBe(30); // 30명 전체
      
      // 첫 번째 직원의 잔액 확인
      const firstEmployeeRow = employeeRows.first();
      const annualLeave = await firstEmployeeRow.locator('[data-testid="annual-leave-balance"]').textContent();
      const sickLeave = await firstEmployeeRow.locator('[data-testid="sick-leave-balance"]').textContent();
      
      expect(parseInt(annualLeave || '0')).toBe(15); // 연차 15일
      expect(parseInt(sickLeave || '0')).toBe(10);   // 병가 10일
    });
  });

  test.describe('TC011-015: 팀 및 부서 구성', () => {
    test('TC011: 병동별 팀 생성', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/teams');
      
      // 각 팀 존재 확인
      for (const team of NURSING_TEAMS) {
        await expect(page.locator(`[data-testid="team-${team.name}"]`)).toBeVisible();
        
        // 팀 상세 정보 확인
        await page.click(`[data-testid="team-${team.name}"]`);
        
        const teamName = await page.locator('[data-testid="team-detail-name"]').textContent();
        expect(teamName).toBe(team.name);
        
        const department = await page.locator('[data-testid="team-department"]').textContent();
        expect(department).toBe(team.department);
        
        await page.click('[data-testid="close-team-detail"]');
      }
    });

    test('TC012: 팀별 최소 인원 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      
      // 각 팀의 최소 인원 설정 확인
      for (const team of NURSING_TEAMS) {
        await page.goto(`/admin/teams/${team.name}/settings`);
        
        const minStaffPerShift = await page.locator('[data-testid="min-staff-per-shift"]').inputValue();
        expect(parseInt(minStaffPerShift)).toBe(team.min_required_per_shift);
        
        // 교대별 세부 설정 확인
        const dayMinStaff = await page.locator('[data-testid="day-min-staff"]').inputValue();
        const eveningMinStaff = await page.locator('[data-testid="evening-min-staff"]').inputValue();
        const nightMinStaff = await page.locator('[data-testid="night-min-staff"]').inputValue();
        
        expect(parseInt(dayMinStaff)).toBe(team.min_required_per_shift);
        expect(parseInt(eveningMinStaff)).toBe(team.min_required_per_shift);
        expect(parseInt(nightMinStaff)).toBe(team.min_required_per_shift);
      }
    });

    test('TC013: 팀 간 교환 허용 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/settings/swap-policies');
      
      // 팀 간 교환 허용 설정 확인
      const allowCrossTeamSwaps = page.locator('[data-testid="allow-cross-team-swaps"]');
      await expect(allowCrossTeamSwaps).toBeChecked();
      
      // 팀별 교환 매트릭스 확인
      const swapMatrix = page.locator('[data-testid="swap-matrix"]');
      await expect(swapMatrix).toBeVisible();
      
      // 내과병동-외과병동 간 교환 허용 확인
      const internalToSurgery = page.locator('[data-testid="swap-internal-surgery"]');
      await expect(internalToSurgery).toBeChecked();
      
      // 중환자실은 중환자실끼리만 교환 허용
      const icuToIcu = page.locator('[data-testid="swap-icu-icu"]');
      await expect(icuToIcu).toBeChecked();
      
      const icuToGeneral = page.locator('[data-testid="swap-icu-general"]');
      await expect(icuToGeneral).not.toBeChecked();
    });

    test('TC014: 응급실 등 특수 부서 24시간 커버리지 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/teams/응급실/coverage');
      
      // 24시간 운영 설정 확인
      const continuousOperation = page.locator('[data-testid="continuous-operation"]');
      await expect(continuousOperation).toBeChecked();
      
      // 각 교대별 필수 인원 설정 확인
      const dayRequiredStaff = await page.locator('[data-testid="day-required-staff"]').inputValue();
      const eveningRequiredStaff = await page.locator('[data-testid="evening-required-staff"]').inputValue();
      const nightRequiredStaff = await page.locator('[data-testid="night-required-staff"]').inputValue();
      
      expect(parseInt(dayRequiredStaff)).toBe(5);
      expect(parseInt(eveningRequiredStaff)).toBe(5);
      expect(parseInt(nightRequiredStaff)).toBe(5);
      
      // 최소 경험자 비율 설정 확인
      const minExperiencedRatio = await page.locator('[data-testid="min-experienced-ratio"]').inputValue();
      expect(parseFloat(minExperiencedRatio)).toBe(0.6); // 60% 이상 경험자
    });

    test('TC015: 팀장(수간호사) 권한 및 승인 워크플로우 설정', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/settings/approval-workflow');
      
      // 휴가 승인 워크플로우 확인
      const leaveApprovalFlow = page.locator('[data-testid="leave-approval-flow"]');
      await expect(leaveApprovalFlow.locator('text=직원 신청')).toBeVisible();
      await expect(leaveApprovalFlow.locator('text=수간호사 승인')).toBeVisible();
      
      // 교환 승인 워크플로우 확인
      const swapApprovalFlow = page.locator('[data-testid="swap-approval-flow"]');
      await expect(swapApprovalFlow.locator('text=요청자 신청')).toBeVisible();
      await expect(swapApprovalFlow.locator('text=상대방 동의')).toBeVisible();
      await expect(swapApprovalFlow.locator('text=수간호사 최종 승인')).toBeVisible();
      
      // 자동 승인 조건 확인
      const autoApprovalConditions = page.locator('[data-testid="auto-approval-conditions"]');
      await expect(autoApprovalConditions.locator('text=응급 휴가')).toBeVisible();
      await expect(autoApprovalConditions.locator('text=병가 (당일)')).toBeVisible();
    });
  });

  test.describe('TC016-020: 제약 조건 및 규칙 검증', () => {
    test('TC016: 11시간 최소 휴식 규칙 검증 테스트', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/rules/test');
      
      // 테스트 케이스 1: 11시간 미만 휴식 (위반)
      await page.fill('[data-testid="test-shift1-end"]', '22:00');
      await page.fill('[data-testid="test-shift2-start"]', '06:00');
      await page.click('[data-testid="test-rest-hours"]');
      
      const violationResult = await page.locator('[data-testid="rest-hours-violation"]');
      await expect(violationResult).toContainText('8시간 휴식은 11시간 최소 기준을 위반');
      
      // 테스트 케이스 2: 11시간 이상 휴식 (정상)
      await page.fill('[data-testid="test-shift1-end"]', '22:00');
      await page.fill('[data-testid="test-shift2-start"]', '10:00');
      await page.click('[data-testid="test-rest-hours"]');
      
      const validResult = await page.locator('[data-testid="rest-hours-valid"]');
      await expect(validResult).toContainText('12시간 휴식은 기준을 충족');
    });

    test('TC017: 연속 야간 근무 5일 제한 규칙 테스트', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/rules/test');
      
      // 5일 연속 야간 근무 시뮬레이션
      const nightShifts = ['night', 'night', 'night', 'night', 'night'];
      
      for (let i = 0; i < nightShifts.length; i++) {
        await page.selectOption(`[data-testid="day-${i + 1}-shift"]`, nightShifts[i]);
      }
      
      await page.click('[data-testid="test-consecutive-nights"]');
      
      // 5일째까지는 경고, 6일째부터 위반
      const warningResult = await page.locator('[data-testid="consecutive-nights-warning"]');
      await expect(warningResult).toContainText('5일 연속 야간 근무 - 최대 허용');
      
      // 6일째 추가 시 위반 확인
      await page.selectOption('[data-testid="day-6-shift"]', 'night');
      await page.click('[data-testid="test-consecutive-nights"]');
      
      const violationResult = await page.locator('[data-testid="consecutive-nights-violation"]');
      await expect(violationResult).toContainText('6일 연속 야간 근무는 5일 제한을 위반');
    });

    test('TC018: 데이나오(Day-Night-Off) 위험 패턴 탐지 테스트', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/rules/test');
      
      // 데이나오 패턴 입력 (데이 → 나이트 → 오프)
      await page.selectOption('[data-testid="pattern-day1"]', 'day');
      await page.selectOption('[data-testid="pattern-day2"]', 'night');
      await page.selectOption('[data-testid="pattern-day3"]', 'off');
      
      await page.click('[data-testid="test-dangerous-pattern"]');
      
      // 위험 패턴 탐지 확인
      const dangerousPatternAlert = page.locator('[data-testid="dangerous-pattern-alert"]');
      await expect(dangerousPatternAlert).toBeVisible();
      await expect(dangerousPatternAlert).toContainText('데이나오 패턴 탐지');
      await expect(dangerousPatternAlert).toContainText('극도로 위험한 패턴');
      
      // 대안 패턴 제안 확인
      const alternativePatterns = page.locator('[data-testid="alternative-patterns"]');
      await expect(alternativePatterns).toContainText('데이 → 오프 → 나이트');
      await expect(alternativePatterns).toContainText('데이 → 이브닝 → 나이트');
    });

    test('TC019: 주 52시간 초과 근무 방지 규칙 테스트', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/rules/test');
      
      // 주 52시간 초과 시나리오 (7일 * 8시간 = 56시간)
      for (let i = 1; i <= 7; i++) {
        await page.selectOption(`[data-testid="week-day${i}"]`, 'day'); // 8시간 근무
      }
      
      await page.click('[data-testid="test-weekly-hours"]');
      
      // 52시간 초과 경고 확인
      const weeklyHoursViolation = page.locator('[data-testid="weekly-hours-violation"]');
      await expect(weeklyHoursViolation).toBeVisible();
      await expect(weeklyHoursViolation).toContainText('56시간은 주 52시간을 초과');
      
      // 정상 시나리오 테스트 (5일 근무 + 2일 오프 = 40시간)
      await page.selectOption('[data-testid="week-day6"]', 'off');
      await page.selectOption('[data-testid="week-day7"]', 'off');
      
      await page.click('[data-testid="test-weekly-hours"]');
      
      const validWeeklyHours = page.locator('[data-testid="weekly-hours-valid"]');
      await expect(validWeeklyHours).toContainText('40시간은 기준 내');
    });

    test('TC020: 각 교대별 최소 인원 보장 규칙 테스트', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/rules/test');
      
      // 최소 인원 미달 시나리오 (데이 교대에 2명만 배치)
      await page.fill('[data-testid="day-shift-count"]', '2');
      await page.fill('[data-testid="day-shift-required"]', '3');
      
      await page.click('[data-testid="test-minimum-staffing"]');
      
      // 최소 인원 미달 경고 확인
      const staffingViolation = page.locator('[data-testid="staffing-violation"]');
      await expect(staffingViolation).toBeVisible();
      await expect(staffingViolation).toContainText('데이 교대 2명은 최소 3명 미달');
      
      // 정상 시나리오 테스트
      await page.fill('[data-testid="day-shift-count"]', '4');
      await page.click('[data-testid="test-minimum-staffing"]');
      
      const validStaffing = page.locator('[data-testid="staffing-valid"]');
      await expect(validStaffing).toContainText('데이 교대 4명은 기준 충족');
      
      // 경험자 비율 테스트
      await page.fill('[data-testid="experienced-count"]', '2');
      await page.fill('[data-testid="total-count"]', '4');
      await page.click('[data-testid="test-experience-ratio"]');
      
      const experienceRatio = page.locator('[data-testid="experience-ratio-result"]');
      await expect(experienceRatio).toContainText('경험자 비율 50% 충족');
    });
  });
});