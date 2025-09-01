import { Page, expect } from '@playwright/test';
import { NURSING_TENANT_DATA, DANGEROUS_PATTERNS, SHIFT_CONSTRAINTS } from '../fixtures/nursing-test-data';

/**
 * 간호 업종 테스트 헬퍼 함수들
 */

export class NursingTestHelpers {
  constructor(private page: Page) {}

  /**
   * 간호사 역할별 로그인
   */
  async loginAsNurse(role: 'head_nurse' | 'charge_nurse' | 'staff_nurse' | 'new_nurse', index: number = 1) {
    const credentials = this.getNurseCredentials(role, index);
    
    await this.page.goto('/auth/login');
    await this.page.fill('[data-testid="email-input"]', credentials.email);
    await this.page.fill('[data-testid="password-input"]', credentials.password);
    await this.page.click('[data-testid="login-button"]');
    
    // 대시보드 로딩 대기
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    
    return credentials;
  }

  /**
   * 간호사 인증 정보 생성
   */
  private getNurseCredentials(role: string, index: number) {
    const roleMap = {
      head_nurse: '수간호사',
      charge_nurse: '책임간호사', 
      staff_nurse: '일반간호사',
      new_nurse: '신규간호사'
    };

    return {
      email: `${role}${index}@hospital.com`,
      password: 'test123!',
      name: `${roleMap[role]}${index}`,
      role: role === 'head_nurse' ? 'manager' : 'employee'
    };
  }

  /**
   * 스케줄 생성 및 검증
   */
  async generateAndValidateSchedule(options: {
    duration_days: number;
    start_date: string;
    expected_violations?: number;
    performance_threshold?: number;
  }) {
    const startTime = Date.now();

    // 스케줄 생성 페이지로 이동
    await this.page.goto('/schedules/generate');
    
    // 생성 옵션 설정
    await this.page.fill('[data-testid="start-date"]', options.start_date);
    await this.page.fill('[data-testid="duration-days"]', options.duration_days.toString());
    
    // 간호 업종 특화 옵션 설정
    await this.page.check('[data-testid="enable-dangerous-pattern-detection"]');
    await this.page.check('[data-testid="enforce-11-hour-rest"]');
    await this.page.check('[data-testid="limit-consecutive-nights"]');
    
    // 생성 시작
    await this.page.click('[data-testid="generate-schedule-button"]');
    
    // 생성 완료 대기
    await expect(this.page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 60000 });
    
    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;
    
    // 성능 검증
    if (options.performance_threshold) {
      expect(generationTime).toBeLessThan(options.performance_threshold);
    }
    
    // 규칙 위반 검증
    const violations = await this.page.locator('[data-testid="rule-violations"]').count();
    if (options.expected_violations !== undefined) {
      expect(violations).toBe(options.expected_violations);
    }
    
    return { generationTime, violations };
  }

  /**
   * 데이나오 패턴 검증
   */
  async validateDayNightOffPattern(employeeName: string, scheduleData: any[]) {
    const patterns = this.extractPatterns(scheduleData, employeeName);
    const hasDangerousPattern = this.checkForDangerousPatterns(patterns);
    
    expect(hasDangerousPattern.found).toBe(false);
    
    return hasDangerousPattern;
  }

  /**
   * 11시간 휴식 규칙 검증
   */
  async validate11HourRestRule(scheduleData: any[]) {
    const violations = [];
    
    for (let i = 0; i < scheduleData.length - 1; i++) {
      const current = scheduleData[i];
      const next = scheduleData[i + 1];
      
      if (current.employee_id === next.employee_id) {
        const restHours = this.calculateRestHours(current.end_time, next.start_time);
        
        if (restHours < SHIFT_CONSTRAINTS.MIN_REST_HOURS) {
          violations.push({
            employee: current.employee_name,
            violation: 'insufficient_rest',
            rest_hours: restHours,
            required: SHIFT_CONSTRAINTS.MIN_REST_HOURS,
            date_range: `${current.date} - ${next.date}`
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * 연속 야간 근무 제한 검증
   */
  async validateConsecutiveNights(scheduleData: any[]) {
    const employeeNightStreaks = new Map();
    
    scheduleData.forEach(assignment => {
      if (assignment.shift_type === 'night') {
        const employeeId = assignment.employee_id;
        const current = employeeNightStreaks.get(employeeId) || { count: 0, dates: [] };
        current.count++;
        current.dates.push(assignment.date);
        employeeNightStreaks.set(employeeId, current);
      } else {
        employeeNightStreaks.set(assignment.employee_id, { count: 0, dates: [] });
      }
    });
    
    const violations = [];
    employeeNightStreaks.forEach((streak, employeeId) => {
      if (streak.count > SHIFT_CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS) {
        violations.push({
          employee_id: employeeId,
          consecutive_nights: streak.count,
          max_allowed: SHIFT_CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS,
          dates: streak.dates
        });
      }
    });
    
    return violations;
  }

  /**
   * 교대별 최소 인원 보장 검증
   */
  async validateMinimumStaffing(scheduleData: any[]) {
    const staffingByShift = new Map();
    
    scheduleData.forEach(assignment => {
      const key = `${assignment.date}_${assignment.shift_type}`;
      const current = staffingByShift.get(key) || { count: 0, assignments: [] };
      current.count++;
      current.assignments.push(assignment);
      staffingByShift.set(key, current);
    });
    
    const violations = [];
    staffingByShift.forEach((staffing, key) => {
      const [date, shiftType] = key.split('_');
      const minRequired = SHIFT_CONSTRAINTS.MIN_STAFF_PER_SHIFT[shiftType] || 3;
      
      if (staffing.count < minRequired) {
        violations.push({
          date,
          shift_type: shiftType,
          actual_count: staffing.count,
          required_count: minRequired,
          shortage: minRequired - staffing.count
        });
      }
    });
    
    return violations;
  }

  /**
   * 휴가 신청 및 승인 프로세스 테스트
   */
  async submitAndApproveLeave(leaveData: {
    type: string;
    start_date: string;
    end_date: string;
    reason?: string;
    emergency?: boolean;
  }) {
    // 휴가 신청
    await this.page.goto('/leaves/request');
    await this.page.selectOption('[data-testid="leave-type"]', leaveData.type);
    await this.page.fill('[data-testid="start-date"]', leaveData.start_date);
    await this.page.fill('[data-testid="end-date"]', leaveData.end_date);
    
    if (leaveData.reason) {
      await this.page.fill('[data-testid="reason"]', leaveData.reason);
    }
    
    if (leaveData.emergency) {
      await this.page.check('[data-testid="emergency-leave"]');
    }
    
    await this.page.click('[data-testid="submit-leave-request"]');
    
    // 신청 완료 확인
    await expect(this.page.locator('[data-testid="leave-request-success"]')).toBeVisible();
    
    const requestId = await this.page.locator('[data-testid="request-id"]').textContent();
    
    return { requestId };
  }

  /**
   * 교대 교환 요청 및 승인
   */
  async requestShiftSwap(swapData: {
    target_employee: string;
    my_shift_date: string;
    target_shift_date: string;
    reason: string;
  }) {
    await this.page.goto('/swaps/request');
    
    // 교환 대상 선택
    await this.page.fill('[data-testid="target-employee"]', swapData.target_employee);
    await this.page.fill('[data-testid="my-shift-date"]', swapData.my_shift_date);
    await this.page.fill('[data-testid="target-shift-date"]', swapData.target_shift_date);
    await this.page.fill('[data-testid="swap-reason"]', swapData.reason);
    
    await this.page.click('[data-testid="submit-swap-request"]');
    
    await expect(this.page.locator('[data-testid="swap-request-success"]')).toBeVisible();
    
    return await this.page.locator('[data-testid="swap-request-id"]').textContent();
  }

  /**
   * 피로도 모니터링 검증
   */
  async validateFatigueMonitoring(employeeId: string, expectedScore: number, shouldAlert: boolean) {
    await this.page.goto(`/monitoring/fatigue/${employeeId}`);
    
    const fatigueScore = await this.page.locator('[data-testid="fatigue-score"]').textContent();
    const scoreValue = parseFloat(fatigueScore || '0');
    
    expect(scoreValue).toBeCloseTo(expectedScore, 1);
    
    if (shouldAlert) {
      await expect(this.page.locator('[data-testid="fatigue-alert"]')).toBeVisible();
    } else {
      await expect(this.page.locator('[data-testid="fatigue-alert"]')).toBeHidden();
    }
    
    return scoreValue;
  }

  /**
   * 실시간 알림 테스트
   */
  async validateRealTimeNotification(expectedType: string, timeout: number = 10000) {
    // 알림 센터 열기
    await this.page.click('[data-testid="notification-center"]');
    
    // 새 알림 대기
    const notification = this.page.locator(`[data-testid="notification-${expectedType}"]`).first();
    await expect(notification).toBeVisible({ timeout });
    
    return notification;
  }

  /**
   * PDF/CSV 내보내기 테스트
   */
  async testScheduleExport(format: 'pdf' | 'csv', scheduleId: string) {
    await this.page.goto(`/schedules/${scheduleId}`);
    
    // 내보내기 버튼 클릭
    await this.page.click(`[data-testid="export-${format}"]`);
    
    // 다운로드 대기
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
    const download = await downloadPromise;
    
    // 파일명 검증
    const fileName = download.suggestedFilename();
    expect(fileName).toContain(format);
    
    return download;
  }

  /**
   * 보안 테스트 - SQL Injection 방어
   */
  async testSQLInjection(payload: string, inputSelector: string) {
    await this.page.fill(inputSelector, payload);
    await this.page.press(inputSelector, 'Enter');
    
    // 에러 페이지나 DB 에러가 나타나지 않아야 함
    await expect(this.page.locator('text=database error')).toBeHidden();
    await expect(this.page.locator('text=sql error')).toBeHidden();
    await expect(this.page.locator('text=syntax error')).toBeHidden();
  }

  /**
   * 성능 테스트 - 페이지 로딩 시간 측정
   */
  async measurePageLoadTime(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  /**
   * 접근성 테스트 헬퍼
   */
  async validateAccessibility() {
    // 키보드 네비게이션 테스트
    await this.page.keyboard.press('Tab');
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // ARIA 라벨 검증
    const buttons = this.page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // 버튼에 접근 가능한 이름이 있어야 함
      expect(ariaLabel || textContent).toBeTruthy();
    }
  }

  // Private helper methods
  private extractPatterns(scheduleData: any[], employeeName: string): string[] {
    return scheduleData
      .filter(assignment => assignment.employee_name === employeeName)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(assignment => assignment.shift_type);
  }

  private checkForDangerousPatterns(patterns: string[]) {
    for (let i = 0; i <= patterns.length - 3; i++) {
      const sequence = patterns.slice(i, i + 3);
      
      if (this.arraysEqual(sequence, DANGEROUS_PATTERNS.DAY_NIGHT_OFF)) {
        return { found: true, pattern: 'DAY_NIGHT_OFF', position: i };
      }
      
      if (this.arraysEqual(sequence, DANGEROUS_PATTERNS.EVENING_NIGHT_DAY)) {
        return { found: true, pattern: 'EVENING_NIGHT_DAY', position: i };
      }
    }
    
    return { found: false };
  }

  private calculateRestHours(endTime: string, nextStartTime: string): number {
    const end = new Date(`2024-01-01 ${endTime}`);
    const start = new Date(`2024-01-01 ${nextStartTime}`);
    
    // 다음날 시작인 경우 처리
    if (start < end) {
      start.setDate(start.getDate() + 1);
    }
    
    return (start.getTime() - end.getTime()) / (1000 * 60 * 60);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }
}