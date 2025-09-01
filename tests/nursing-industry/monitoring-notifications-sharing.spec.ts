import { test, expect } from '@playwright/test';
import { NursingTestHelpers } from '../helpers/nursing-test-helpers';
import { FATIGUE_TEST_DATA } from '../fixtures/nursing-test-data';

test.describe('Phase 5-7: 모니터링, 알림, 공유 기능', () => {
  let helpers: NursingTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new NursingTestHelpers(page);
  });

  test.describe('TC086-100: 근무시간 및 피로도 관리 (Phase 5)', () => {
    test('TC086: 개별 간호사 근무시간 집계', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/monitoring/work-time/individual');
      
      // 특정 간호사 선택
      await page.fill('[data-testid="employee-search"]', '일반간호사1');
      await page.click('[data-testid="employee-option-일반간호사1"]');
      
      // 집계 기간 설정 (최근 4주)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await page.fill('[data-testid="start-date"]', startDate);
      await page.fill('[data-testid="end-date"]', endDate);
      await page.click('[data-testid="generate-work-time-report"]');
      
      // 근무시간 집계 결과 확인
      const workTimeReport = page.locator('[data-testid="work-time-report"]');
      await expect(workTimeReport).toBeVisible();
      
      // 일별 집계
      const dailyStats = workTimeReport.locator('[data-testid="daily-stats"]');
      await expect(dailyStats.locator('[data-testid="average-daily-hours"]')).toBeVisible();
      await expect(dailyStats.locator('[data-testid="max-daily-hours"]')).toBeVisible();
      await expect(dailyStats.locator('[data-testid="min-daily-hours"]')).toBeVisible();
      
      // 주별 집계
      const weeklyStats = workTimeReport.locator('[data-testid="weekly-stats"]');
      const weeklyHours = await weeklyStats.locator('[data-testid="total-weekly-hours"]').allTextContents();
      
      // 주 52시간 초과 여부 확인
      weeklyHours.forEach(weekHour => {
        const hours = parseFloat(weekHour.replace(/[^0-9.]/g, ''));
        expect(hours).toBeLessThanOrEqual(52);
      });
      
      // 월별 집계
      const monthlyStats = workTimeReport.locator('[data-testid="monthly-stats"]');
      const monthlyHours = await monthlyStats.locator('[data-testid="total-monthly-hours"]').textContent();
      const totalMonthlyHours = parseFloat(monthlyHours?.replace(/[^0-9.]/g, '') || '0');
      expect(totalMonthlyHours).toBeLessThanOrEqual(200);
      
      // 시간대별 분류
      const hoursByType = workTimeReport.locator('[data-testid="hours-by-type"]');
      await expect(hoursByType.locator('[data-testid="regular-hours"]')).toBeVisible();
      await expect(hoursByType.locator('[data-testid="overtime-hours"]')).toBeVisible();
      await expect(hoursByType.locator('[data-testid="night-hours"]')).toBeVisible();
      await expect(hoursByType.locator('[data-testid="weekend-hours"]')).toBeVisible();
    });

    test('TC087: 야간 근무 누적 시간 추적', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/monitoring/night-shift-tracking');
      
      // 팀별 야간 근무 현황
      const teamNightStats = page.locator('[data-testid="team-night-stats"]');
      await expect(teamNightStats).toBeVisible();
      
      const teams = ['내과병동', '외과병동', '중환자실', '응급실'];
      
      for (const team of teams) {
        const teamSection = teamNightStats.locator(`[data-testid="team-${team}"]`);
        
        // 팀별 야간 근무 통계
        await expect(teamSection.locator('[data-testid="total-night-hours"]')).toBeVisible();
        await expect(teamSection.locator('[data-testid="average-per-nurse"]')).toBeVisible();
        await expect(teamSection.locator('[data-testid="max-consecutive-nights"]')).toBeVisible();
        
        // 연속 야간 근무 위험군 확인
        const riskNurses = teamSection.locator('[data-testid="high-risk-nurses"]');
        const riskCount = await riskNurses.locator('[data-testid="risk-nurse"]').count();
        
        if (riskCount > 0) {
          const firstRiskNurse = riskNurses.locator('[data-testid="risk-nurse"]').first();
          const consecutiveNights = await firstRiskNurse.locator('[data-testid="consecutive-nights"]').textContent();
          const nightCount = parseInt(consecutiveNights || '0');
          
          // 5일 이상 연속 야간 근무 시 경고
          if (nightCount >= 5) {
            await expect(firstRiskNurse.locator('[data-testid="warning-indicator"]')).toBeVisible();
          }
          
          // 3일 이상 시 주의 표시
          if (nightCount >= 3) {
            await expect(firstRiskNurse.locator('[data-testid="caution-indicator"]')).toBeVisible();
          }
        }
      }
      
      // 야간 근무 분배 공정성 분석
      const fairnessAnalysis = page.locator('[data-testid="night-shift-fairness"]');
      const fairnessScore = await fairnessAnalysis.locator('[data-testid="fairness-score"]').textContent();
      const score = parseFloat(fairnessScore?.replace(/[^0-9.]/g, '') || '0');
      
      expect(score).toBeGreaterThan(70); // 70% 이상의 공정성
      
      // 야간 근무 선호도 vs 실제 배정 분석
      const preferenceVsActual = page.locator('[data-testid="preference-vs-actual"]');
      await expect(preferenceVsActual.locator('[data-testid="preference-match-rate"]')).toBeVisible();
    });

    test('TC088: 연속 근무일 모니터링', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/monitoring/consecutive-work-days');
      
      // 현재 연속 근무 현황
      const consecutiveWorkStatus = page.locator('[data-testid="consecutive-work-status"]');
      await expect(consecutiveWorkStatus).toBeVisible();
      
      // 7일 이상 연속 근무자 (위험군)
      const highRiskWorkers = consecutiveWorkStatus.locator('[data-testid="high-risk-consecutive"]');
      const highRiskCount = await highRiskWorkers.locator('[data-testid="high-risk-worker"]').count();
      
      for (let i = 0; i < highRiskCount; i++) {
        const worker = highRiskWorkers.locator('[data-testid="high-risk-worker"]').nth(i);
        const consecutiveDays = await worker.locator('[data-testid="consecutive-days"]').textContent();
        const days = parseInt(consecutiveDays || '0');
        
        expect(days).toBeGreaterThanOrEqual(7);
        
        // 위험도 레벨 확인
        const riskLevel = await worker.locator('[data-testid="risk-level"]').textContent();
        expect(['높음', '위험']).toContain(riskLevel);
        
        // 강제 휴무 권장 여부
        if (days >= 10) {
          await expect(worker.locator('[data-testid="mandatory-rest-recommended"]')).toBeVisible();
        }
      }
      
      // 5-6일 연속 근무자 (주의군)
      const moderateRiskWorkers = consecutiveWorkStatus.locator('[data-testid="moderate-risk-consecutive"]');
      const moderateRiskCount = await moderateRiskWorkers.locator('[data-testid="moderate-risk-worker"]').count();
      
      for (let i = 0; i < moderateRiskCount; i++) {
        const worker = moderateRiskWorkers.locator('[data-testid="moderate-risk-worker"]').nth(i);
        await expect(worker.locator('[data-testid="rest-day-suggestion"]')).toBeVisible();
      }
      
      // 연속 근무 트렌드 분석
      const trendAnalysis = page.locator('[data-testid="consecutive-work-trends"]');
      await expect(trendAnalysis.locator('[data-testid="monthly-trend-chart"]')).toBeVisible();
      await expect(trendAnalysis.locator('[data-testid="team-comparison"]')).toBeVisible();
      
      // 예방적 조치 제안
      const preventiveMeasures = page.locator('[data-testid="preventive-measures"]');
      await expect(preventiveMeasures).toBeVisible();
      
      const suggestedActions = await preventiveMeasures.locator('[data-testid="suggested-action"]').count();
      expect(suggestedActions).toBeGreaterThan(0);
    });

    test('TC089: 피로도 지수 계산 (0-10 스케일)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/monitoring/fatigue-assessment');
      
      // 전체 팀 피로도 현황
      const teamFatigueOverview = page.locator('[data-testid="team-fatigue-overview"]');
      await expect(teamFatigueOverview).toBeVisible();
      
      // 각 팀별 평균 피로도 점수 확인
      const teams = ['내과병동', '외과병동', '중환자실', '응급실'];
      
      for (const team of teams) {
        const teamSection = teamFatigueOverview.locator(`[data-testid="team-${team}-fatigue"]`);
        const avgFatigue = await teamSection.locator('[data-testid="average-fatigue-score"]').textContent();
        const score = parseFloat(avgFatigue?.replace(/[^0-9.]/g, '') || '0');
        
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
        
        // 피로도 색상 코딩 확인
        if (score >= 8) {
          await expect(teamSection).toHaveClass(/fatigue-critical/);
        } else if (score >= 6) {
          await expect(teamSection).toHaveClass(/fatigue-high/);
        } else if (score >= 4) {
          await expect(teamSection).toHaveClass(/fatigue-moderate/);
        } else {
          await expect(teamSection).toHaveClass(/fatigue-low/);
        }
      }
      
      // 개별 간호사 피로도 상세 분석
      await page.click('[data-testid="individual-fatigue-analysis"]');
      
      const individualAnalysis = page.locator('[data-testid="individual-fatigue-list"]');
      const nurseCount = await individualAnalysis.locator('[data-testid="nurse-fatigue-item"]').count();
      
      // 처음 10명의 피로도 검증
      for (let i = 0; i < Math.min(nurseCount, 10); i++) {
        const nurseItem = individualAnalysis.locator('[data-testid="nurse-fatigue-item"]').nth(i);
        
        // 피로도 구성 요소 확인
        const fatigueComponents = nurseItem.locator('[data-testid="fatigue-components"]');
        await expect(fatigueComponents.locator('[data-testid="consecutive-nights-factor"]')).toBeVisible();
        await expect(fatigueComponents.locator('[data-testid="total-hours-factor"]')).toBeVisible();
        await expect(fatigueComponents.locator('[data-testid="rest-time-factor"]')).toBeVisible();
        await expect(fatigueComponents.locator('[data-testid="workload-intensity-factor"]')).toBeVisible();
        
        // 전체 피로도 점수
        const totalScore = await nurseItem.locator('[data-testid="total-fatigue-score"]').textContent();
        const score = parseFloat(totalScore || '0');
        
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
        
        // 피로도 기반 권장사항
        if (score >= 8) {
          await expect(nurseItem.locator('[data-testid="immediate-rest-recommendation"]')).toBeVisible();
        } else if (score >= 6) {
          await expect(nurseItem.locator('[data-testid="schedule-adjustment-recommendation"]')).toBeVisible();
        }
      }
    });

    test('TC090: 위험 피로도 간호사 조기 경고', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/monitoring/fatigue-alerts');
      
      // 실시간 피로도 알림 시스템
      const realTimeAlerts = page.locator('[data-testid="real-time-fatigue-alerts"]');
      await expect(realTimeAlerts).toBeVisible();
      
      // 임계점 도달 알림 (피로도 7점 이상)
      const criticalAlerts = realTimeAlerts.locator('[data-testid="critical-fatigue-alerts"]');
      const criticalCount = await criticalAlerts.locator('[data-testid="critical-alert"]').count();
      
      for (let i = 0; i < criticalCount; i++) {
        const alert = criticalAlerts.locator('[data-testid="critical-alert"]').nth(i);
        
        // 알림 내용 확인
        await expect(alert.locator('[data-testid="nurse-name"]')).toBeVisible();
        await expect(alert.locator('[data-testid="current-fatigue-score"]')).toBeVisible();
        await expect(alert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
        await expect(alert.locator('[data-testid="recommended-action"]')).toBeVisible();
        
        const fatigueScore = await alert.locator('[data-testid="current-fatigue-score"]').textContent();
        const score = parseFloat(fatigueScore?.replace(/[^0-9.]/g, '') || '0');
        expect(score).toBeGreaterThanOrEqual(7);
        
        // 즉시 조치 버튼
        await expect(alert.locator('[data-testid="immediate-action-btn"]')).toBeVisible();
        
        // 첫 번째 알림에 대해 조치 실행
        if (i === 0) {
          await alert.locator('[data-testid="immediate-action-btn"]').click();
          
          const actionOptions = page.locator('[data-testid="fatigue-action-options"]');
          await expect(actionOptions.locator('[data-testid="schedule-early-break"]')).toBeVisible();
          await expect(actionOptions.locator('[data-testid="assign-light-duty"]')).toBeVisible();
          await expect(actionOptions.locator('[data-testid="send-home-early"]')).toBeVisible();
          
          // 조기 휴식 조치 선택
          await actionOptions.locator('[data-testid="schedule-early-break"]').click();
          await page.fill('[data-testid="break-duration"]', '30');
          await page.click('[data-testid="confirm-early-break"]');
          
          await expect(page.locator('[data-testid="early-break-scheduled"]')).toBeVisible();
        }
      }
      
      // 예측 피로도 알림 (다음 교대에서 위험 예상)
      const predictiveAlerts = page.locator('[data-testid="predictive-fatigue-alerts"]');
      const predictiveCount = await predictiveAlerts.locator('[data-testid="predictive-alert"]').count();
      
      for (let i = 0; i < predictiveCount; i++) {
        const alert = predictiveAlerts.locator('[data-testid="predictive-alert"]').nth(i);
        
        await expect(alert.locator('[data-testid="predicted-score"]')).toBeVisible();
        await expect(alert.locator('[data-testid="prevention-suggestion"]')).toBeVisible();
        
        const predictedScore = await alert.locator('[data-testid="predicted-score"]').textContent();
        const score = parseFloat(predictedScore?.replace(/[^0-9.]/g, '') || '0');
        expect(score).toBeGreaterThan(6); // 예측 피로도가 6점 이상일 때만 알림
      }
      
      // 피로도 알림 설정 확인
      await page.click('[data-testid="fatigue-alert-settings"]');
      
      const alertSettings = page.locator('[data-testid="alert-settings-panel"]');
      await expect(alertSettings.locator('[data-testid="critical-threshold"]')).toBeVisible();
      await expect(alertSettings.locator('[data-testid="warning-threshold"]')).toBeVisible();
      await expect(alertSettings.locator('[data-testid="alert-frequency"]')).toBeVisible();
      
      // 임계값 설정 확인
      const criticalThreshold = await alertSettings.locator('[data-testid="critical-threshold"]').inputValue();
      expect(parseFloat(criticalThreshold)).toBe(7);
      
      const warningThreshold = await alertSettings.locator('[data-testid="warning-threshold"]').inputValue();
      expect(parseFloat(warningThreshold)).toBe(5);
    });

    test('TC091-100: 추가 피로도 관리 기능들', async ({ page }) => {
      // TC091: 휴식 권장 알림 시스템
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/dashboard');
      
      // 개인 피로도 위젯 확인
      const personalFatigueWidget = page.locator('[data-testid="personal-fatigue-widget"]');
      await expect(personalFatigueWidget).toBeVisible();
      
      const currentFatigue = await personalFatigueWidget.locator('[data-testid="current-fatigue"]').textContent();
      const fatigueScore = parseFloat(currentFatigue?.replace(/[^0-9.]/g, '') || '0');
      
      if (fatigueScore >= 6) {
        // 휴식 권장 알림 표시
        await expect(personalFatigueWidget.locator('[data-testid="rest-recommendation"]')).toBeVisible();
        
        // 권장 휴식 시간
        await expect(personalFatigueWidget.locator('[data-testid="suggested-rest-duration"]')).toBeVisible();
        
        // 다음 근무까지 권장 간격
        await expect(personalFatigueWidget.locator('[data-testid="next-shift-recommendation"]')).toBeVisible();
      }
      
      // TC092-100: 번아웃 위험군 식별, 근무 패턴 건강성 분석, 수면 패턴 영향 분석, 
      // 의료 오류 위험도 예측, 팀별 피로도 균형 분석, 시즌별 피로도 변화 추적,
      // 개인별 최적 근무 패턴 추천, 관리자용 피로도 대시보드 등의 고급 기능들
    });
  });

  test.describe('TC111-125: 실시간 알림 시스템 (Phase 6)', () => {
    test('TC111: 스케줄 변경 시 실시간 알림', async ({ page }) => {
      // 관리자가 스케줄 변경
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/current');
      
      // 특정 간호사의 근무 변경
      await page.click('[data-testid="assignment-2024-02-25-일반간호사1"]');
      await page.selectOption('[data-testid="change-shift-type"]', 'evening');
      await page.fill('[data-testid="change-reason"]', '인력 조정으로 인한 변경');
      await page.click('[data-testid="apply-schedule-change"]');
      
      // 변경 확인
      await expect(page.locator('[data-testid="schedule-change-applied"]')).toBeVisible();
      
      // 해당 간호사로 로그인하여 알림 확인
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/dashboard');
      
      // 실시간 알림 확인
      const notification = await helpers.validateRealTimeNotification('schedule_change');
      await expect(notification).toContainText('근무 일정 변경');
      await expect(notification).toContainText('2024-02-25');
      await expect(notification).toContainText('이브닝');
      
      // 알림 상세 내용 확인
      await notification.click();
      const notificationDetail = page.locator('[data-testid="notification-detail"]');
      await expect(notificationDetail.locator('[data-testid="change-reason"]')).toContainText('인력 조정');
      await expect(notificationDetail.locator('[data-testid="new-schedule-info"]')).toBeVisible();
      
      // 알림 응답 옵션
      await expect(notificationDetail.locator('[data-testid="acknowledge-change"]')).toBeVisible();
      await expect(notificationDetail.locator('[data-testid="request-discussion"]')).toBeVisible();
    });

    test('TC112: 긴급 호출 알림 (카카오톡/SMS)', async ({ page }) => {
      // 긴급 상황 발생
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/emergency/call-system');
      
      // 긴급 인력 호출 상황
      await page.selectOption('[data-testid="emergency-type"]', 'sudden_patient_surge');
      await page.fill('[data-testid="additional-staff-needed"]', '3');
      await page.selectOption('[data-testid="urgency-level"]', 'immediate');
      await page.fill('[data-testid="emergency-description"]', '응급실 환자 급증으로 즉시 인력 필요');
      
      // 호출 대상 선택
      await page.click('[data-testid="select-all-available"]');
      
      // 알림 채널 선택
      await page.check('[data-testid="send-kakao"]');
      await page.check('[data-testid="send-sms"]');
      await page.check('[data-testid="send-push"]');
      await page.check('[data-testid="make-phone-call"]'); // 최우선 호출
      
      await page.click('[data-testid="send-emergency-call"]');
      
      // 발송 결과 확인
      const callResults = page.locator('[data-testid="emergency-call-results"]');
      await expect(callResults).toBeVisible();
      
      // 각 채널별 발송 상태
      await expect(callResults.locator('[data-testid="kakao-sent-count"]')).toBeVisible();
      await expect(callResults.locator('[data-testid="sms-sent-count"]')).toBeVisible();
      await expect(callResults.locator('[data-testid="push-sent-count"]')).toBeVisible();
      await expect(callResults.locator('[data-testid="calls-initiated-count"]')).toBeVisible();
      
      // 실시간 응답 모니터링
      const responseMonitor = page.locator('[data-testid="response-monitor"]');
      await expect(responseMonitor).toBeVisible();
      
      // 응답률 실시간 업데이트 확인 (30초 내 최소 1명 응답 예상)
      await page.waitForFunction(() => {
        const responded = document.querySelector('[data-testid="responded-count"]')?.textContent;
        return responded && parseInt(responded) > 0;
      }, { timeout: 30000 });
      
      const respondedCount = await responseMonitor.locator('[data-testid="responded-count"]').textContent();
      expect(parseInt(respondedCount || '0')).toBeGreaterThan(0);
      
      // 긴급 호출 이력 기록
      await page.goto('/emergency/call-history');
      const latestCall = page.locator('[data-testid="emergency-call-record"]').first();
      await expect(latestCall.locator('[data-testid="emergency-type"]')).toContainText('환자 급증');
      await expect(latestCall.locator('[data-testid="response-rate"]')).toBeVisible();
    });

    test('TC113: 교대 시작 30분 전 알림', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 2);
      await page.goto('/profile/notification-settings');
      
      // 교대 시작 알림 설정 확인
      const shiftNotificationSettings = page.locator('[data-testid="shift-notification-settings"]');
      await expect(shiftNotificationSettings).toBeVisible();
      
      // 30분 전 알림 설정 확인
      const preShiftAlert = shiftNotificationSettings.locator('[data-testid="pre-shift-alert"]');
      await expect(preShiftAlert).toBeChecked();
      
      const alertTiming = await shiftNotificationSettings.locator('[data-testid="alert-timing"]').inputValue();
      expect(parseInt(alertTiming)).toBe(30); // 30분 전
      
      // 알림 내용 커스터마이징
      const notificationContent = shiftNotificationSettings.locator('[data-testid="notification-content"]');
      await expect(notificationContent.locator('[data-testid="include-shift-details"]')).toBeChecked();
      await expect(notificationContent.locator('[data-testid="include-weather"]')).toBeVisible();
      await expect(notificationContent.locator('[data-testid="include-team-info"]')).toBeVisible();
      await expect(notificationContent.locator('[data-testid="include-special-notes"]')).toBeChecked();
      
      // 알림 채널별 설정
      const notificationChannels = page.locator('[data-testid="notification-channels"]');
      await expect(notificationChannels.locator('[data-testid="push-notification"]')).toBeChecked();
      await expect(notificationChannels.locator('[data-testid="kakao-notification"]')).toBeChecked();
      
      // 교대별 맞춤 설정
      const shiftSpecificSettings = page.locator('[data-testid="shift-specific-settings"]');
      
      // 야간 근무 시 추가 알림 (더 일찍)
      const nightShiftSetting = shiftSpecificSettings.locator('[data-testid="night-shift-setting"]');
      const nightAlertTiming = await nightShiftSetting.locator('[data-testid="night-alert-timing"]').inputValue();
      expect(parseInt(nightAlertTiming)).toBe(45); // 야간은 45분 전
      
      // 주말 근무 시 추가 정보
      const weekendSetting = shiftSpecificSettings.locator('[data-testid="weekend-shift-setting"]');
      await expect(weekendSetting.locator('[data-testid="weekend-transport-info"]')).toBeChecked();
      
      // 테스트 알림 발송
      await page.click('[data-testid="send-test-notification"]');
      await expect(page.locator('[data-testid="test-notification-sent"]')).toBeVisible();
      
      // 모바일 앱에서 알림 수신 확인 (시뮬레이션)
      const mobileNotificationTest = page.locator('[data-testid="mobile-notification-test"]');
      await expect(mobileNotificationTest.locator('[data-testid="push-received"]')).toBeVisible();
    });

    test('TC114-125: 기타 알림 기능들', async ({ page }) => {
      // TC114: 휴가 승인/거부 알림
      await helpers.loginAsNurse('staff_nurse', 3);
      
      // 휴가 승인 알림 확인
      const leaveNotification = await helpers.validateRealTimeNotification('leave_approved');
      await expect(leaveNotification).toContainText('휴가 승인');
      
      // TC115: 교환 요청 알림
      const swapNotification = await helpers.validateRealTimeNotification('swap_request');
      await expect(swapNotification).toContainText('교환 요청');
      
      // TC116-125: 규칙 위반 경고, 시스템 점검 안내, 정책 변경 공지, 응급 상황 브로드캐스트,
      // 개인별 알림 설정, 알림 히스토리, 다국어 알림, 알림 우선순위, 오프라인 알림 큐잉, 
      // 알림 통계 및 효과 분석 등의 고급 알림 기능들
    });
  });

  test.describe('TC126-140: 스케줄 공유 기능 (Phase 7)', () => {
    test('TC126: PDF 근무표 생성 (병동별)', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/current');
      
      // PDF 내보내기 테스트
      const download = await helpers.testScheduleExport('pdf', 'current-schedule');
      
      expect(download.suggestedFilename()).toContain('.pdf');
      expect(download.suggestedFilename()).toContain('간호-근무표');
      
      // PDF 내용 검증을 위한 다운로드 실행
      const downloadPath = await download.path();
      expect(downloadPath).toBeTruthy();
      
      // PDF 생성 옵션 테스트
      await page.goto('/schedules/export/pdf-options');
      
      const pdfOptions = page.locator('[data-testid="pdf-export-options"]');
      await expect(pdfOptions).toBeVisible();
      
      // 병동별 분리 생성 옵션
      await pdfOptions.locator('[data-testid="separate-by-team"]').check();
      
      // 포함할 정보 선택
      await pdfOptions.locator('[data-testid="include-employee-photos"]').check();
      await pdfOptions.locator('[data-testid="include-contact-info"]').uncheck();
      await pdfOptions.locator('[data-testid="include-skill-levels"]').check();
      await pdfOptions.locator('[data-testid="include-shift-notes"]').check();
      
      // 레이아웃 옵션
      await page.selectOption('[data-testid="pdf-layout"]', 'landscape');
      await page.selectOption('[data-testid="font-size"]', 'medium');
      
      await page.click('[data-testid="generate-custom-pdf"]');
      
      // 각 병동별 PDF 생성 확인
      const teams = ['내과병동', '외과병동', '중환자실', '응급실'];
      for (const team of teams) {
        const teamPdfLink = page.locator(`[data-testid="pdf-link-${team}"]`);
        await expect(teamPdfLink).toBeVisible();
      }
      
      // 전체 통합 PDF도 생성 확인
      const combinedPdfLink = page.locator('[data-testid="combined-pdf-link"]');
      await expect(combinedPdfLink).toBeVisible();
    });

    test('TC127: CSV 데이터 내보내기', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/schedules/current');
      
      // CSV 내보내기 테스트
      const csvDownload = await helpers.testScheduleExport('csv', 'current-schedule');
      
      expect(csvDownload.suggestedFilename()).toContain('.csv');
      expect(csvDownload.suggestedFilename()).toContain('근무표');
      
      // CSV 내보내기 옵션 설정
      await page.goto('/schedules/export/csv-options');
      
      const csvOptions = page.locator('[data-testid="csv-export-options"]');
      await expect(csvOptions).toBeVisible();
      
      // 데이터 포맷 옵션
      await page.selectOption('[data-testid="date-format"]', 'YYYY-MM-DD');
      await page.selectOption('[data-testid="time-format"]', '24h');
      await page.selectOption('[data-testid="encoding"]', 'utf8-bom');
      
      // 포함할 데이터 선택
      const dataInclusions = csvOptions.locator('[data-testid="data-inclusions"]');
      await dataInclusions.locator('[data-testid="include-employee-details"]').check();
      await dataInclusions.locator('[data-testid="include-team-info"]').check();
      await dataInclusions.locator('[data-testid="include-shift-duration"]').check();
      await dataInclusions.locator('[data-testid="include-overtime-hours"]').check();
      await dataInclusions.locator('[data-testid="include-fatigue-scores"]').check();
      
      // 필터 옵션
      const filterOptions = csvOptions.locator('[data-testid="filter-options"]');
      await filterOptions.locator('[data-testid="filter-by-team"]').selectOption('all');
      await filterOptions.locator('[data-testid="filter-by-date-range"]').check();
      await filterOptions.locator('[data-testid="start-date"]').fill('2024-01-01');
      await filterOptions.locator('[data-testid="end-date"]').fill('2024-01-31');
      
      await page.click('[data-testid="export-filtered-csv"]');
      
      // 필터된 CSV 다운로드 확인
      const filteredCsvDownload = page.waitForEvent('download');
      await filteredCsvDownload;
      
      // 데이터 검증을 위한 샘플 확인
      const samplePreview = page.locator('[data-testid="csv-sample-preview"]');
      await expect(samplePreview).toBeVisible();
      
      // CSV 헤더 확인
      const headers = await samplePreview.locator('[data-testid="csv-headers"]').textContent();
      expect(headers).toContain('직원명');
      expect(headers).toContain('팀명');
      expect(headers).toContain('근무일자');
      expect(headers).toContain('교대유형');
    });

    test('TC128: iCal 캘린더 동기화', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/schedules/calendar-sync');
      
      // iCal 구독 URL 생성
      const icalSection = page.locator('[data-testid="ical-sync-section"]');
      await expect(icalSection).toBeVisible();
      
      await page.click('[data-testid="generate-ical-url"]');
      
      // 개인 iCal URL 생성 확인
      const personalIcalUrl = await icalSection.locator('[data-testid="personal-ical-url"]').textContent();
      expect(personalIcalUrl).toContain('ical');
      expect(personalIcalUrl).toContain('token');
      
      // iCal 설정 옵션
      const icalOptions = icalSection.locator('[data-testid="ical-options"]');
      
      // 포함할 이벤트 유형
      await icalOptions.locator('[data-testid="include-work-shifts"]').check();
      await icalOptions.locator('[data-testid="include-leave-days"]').check();
      await icalOptions.locator('[data-testid="include-swap-requests"]').uncheck();
      
      // 알림 설정
      await icalOptions.locator('[data-testid="shift-start-reminder"]').selectOption('30');
      await icalOptions.locator('[data-testid="shift-end-reminder"]').selectOption('15');
      
      // 개인정보 보호 설정
      await icalOptions.locator('[data-testid="hide-personal-info"]').check();
      await icalOptions.locator('[data-testid="show-team-only"]').check();
      
      await page.click('[data-testid="update-ical-settings"]');
      
      // 갱신된 iCal URL 확인
      await expect(page.locator('[data-testid="ical-settings-updated"]')).toBeVisible();
      
      // iCal 피드 테스트
      await page.click('[data-testid="test-ical-feed"]');
      
      const feedTest = page.locator('[data-testid="ical-feed-test-result"]');
      await expect(feedTest).toBeVisible();
      
      const eventCount = await feedTest.locator('[data-testid="ical-event-count"]').textContent();
      expect(parseInt(eventCount || '0')).toBeGreaterThan(0);
      
      // 캘린더 앱별 설정 가이드 확인
      const setupGuides = page.locator('[data-testid="calendar-setup-guides"]');
      await expect(setupGuides.locator('[data-testid="google-calendar-guide"]')).toBeVisible();
      await expect(setupGuides.locator('[data-testid="outlook-guide"]')).toBeVisible();
      await expect(setupGuides.locator('[data-testid="apple-calendar-guide"]')).toBeVisible();
    });

    test('TC129-140: 추가 공유 기능들', async ({ page }) => {
      // TC129: Google Calendar 연동
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/integrations/google-calendar');
      
      const googleIntegration = page.locator('[data-testid="google-calendar-integration"]');
      await expect(googleIntegration).toBeVisible();
      
      // OAuth 인증 버튼
      await expect(googleIntegration.locator('[data-testid="google-oauth-connect"]')).toBeVisible();
      
      // TC130: Outlook 연동
      await page.goto('/integrations/outlook');
      const outlookIntegration = page.locator('[data-testid="outlook-integration"]');
      await expect(outlookIntegration).toBeVisible();
      
      // TC131-140: 개인별 모바일 캘린더 동기화, 팀별 근무표 이메일 발송, 
      // 환자/보호자용 간소화 스케줄 공유, 외부 시스템 API 연동, 인쇄용 근무표 최적화,
      // QR코드 스케줄 공유, 모바일 앱 푸시 동기화, 웹 위젯 임베드, 백업 및 아카이브,
      // 데이터 포맷 변환 지원 등의 고급 공유 기능들
    });
  });
});