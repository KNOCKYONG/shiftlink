import { test, expect } from '@playwright/test';
import { NursingTestHelpers } from '../helpers/nursing-test-helpers';
import { LEAVE_SCENARIOS } from '../fixtures/nursing-test-data';

test.describe('Phase 3-4: 교환/트레이드 & 휴가/결근 관리', () => {
  let helpers: NursingTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new NursingTestHelpers(page);
  });

  test.describe('TC046-055: 교환 요청 프로세스 (Phase 3)', () => {
    test('TC046: 간호사 간 교대 교환 요청 생성', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 1);
      
      const swapRequestId = await helpers.requestShiftSwap({
        target_employee: '일반간호사2',
        my_shift_date: '2024-01-15',
        target_shift_date: '2024-01-16', 
        reason: '개인 병원 방문으로 인한 교환 요청'
      });
      
      expect(swapRequestId).toBeTruthy();
      
      // 교환 요청 상세 확인
      await page.goto(`/swaps/${swapRequestId}`);
      await expect(page.locator('[data-testid="swap-status"]')).toContainText('대기중');
      await expect(page.locator('[data-testid="requester-name"]')).toContainText('일반간호사1');
      await expect(page.locator('[data-testid="target-employee"]')).toContainText('일반간호사2');
      await expect(page.locator('[data-testid="swap-reason"]')).toContainText('개인 병원 방문');
    });

    test('TC047: 교환 가능한 대상자 자동 필터링', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 3);
      await page.goto('/swaps/request');
      
      // 내 근무 날짜 선택 (2024-01-20 야간 근무)
      await page.fill('[data-testid="my-shift-date"]', '2024-01-20');
      await page.selectOption('[data-testid="my-shift-type"]', 'night');
      
      // 교환 가능한 대상자 자동 필터링 실행
      await page.click('[data-testid="find-swap-candidates"]');
      
      const candidateList = page.locator('[data-testid="swap-candidates-list"]');
      await expect(candidateList).toBeVisible();
      
      const candidateCount = await candidateList.locator('[data-testid="candidate-item"]').count();
      expect(candidateCount).toBeGreaterThan(0);
      
      // 각 후보자의 자격 요건 확인
      for (let i = 0; i < Math.min(candidateCount, 5); i++) {
        const candidate = candidateList.locator('[data-testid="candidate-item"]').nth(i);
        
        // 11시간 휴식 규칙 준수 여부 확인
        const restHoursValid = await candidate.locator('[data-testid="rest-hours-valid"]').isVisible();
        expect(restHoursValid).toBe(true);
        
        // 연속 야간 제한 준수 여부 확인
        const consecutiveNightsValid = await candidate.locator('[data-testid="consecutive-nights-valid"]').isVisible();
        expect(consecutiveNightsValid).toBe(true);
        
        // 같은 팀 여부 또는 팀간 교환 허용 여부 확인
        const teamCompatible = await candidate.locator('[data-testid="team-compatible"]').isVisible();
        expect(teamCompatible).toBe(true);
      }
      
      // 신규간호사는 야간 근무 후보에서 제외 확인
      const candidateNames = await candidateList.locator('[data-testid="candidate-name"]').allTextContents();
      const hasNewNurse = candidateNames.some(name => name.includes('신규'));
      expect(hasNewNurse).toBe(false);
    });

    test('TC048: 교환 요청 승인 워크플로우', async ({ page }) => {
      // 1단계: 교환 요청자가 요청 생성
      await helpers.loginAsNurse('staff_nurse', 1);
      const swapRequestId = await helpers.requestShiftSwap({
        target_employee: '일반간호사4',
        my_shift_date: '2024-01-22',
        target_shift_date: '2024-01-23',
        reason: '가족 행사 참석'
      });
      
      // 2단계: 교환 대상자가 동의
      await helpers.loginAsNurse('staff_nurse', 4);
      await page.goto(`/swaps/${swapRequestId}`);
      
      await page.fill('[data-testid="response-message"]', '교환에 동의합니다.');
      await page.click('[data-testid="accept-swap-request"]');
      
      await expect(page.locator('[data-testid="swap-status"]')).toContainText('상대방 동의');
      
      // 3단계: 수간호사 최종 승인
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/swaps/pending-approval');
      
      const pendingSwap = page.locator(`[data-testid="swap-${swapRequestId}"]`);
      await expect(pendingSwap).toBeVisible();
      
      // 승인 전 규칙 재검증
      await pendingSwap.locator('[data-testid="revalidate-rules"]').click();
      
      const validationResult = await pendingSwap.locator('[data-testid="validation-result"]').textContent();
      expect(validationResult).toContain('모든 규칙 통과');
      
      // 최종 승인
      await pendingSwap.locator('[data-testid="approve-swap"]').click();
      await page.fill('[data-testid="approval-comment"]', '규칙을 준수하여 교환을 승인합니다.');
      await page.click('[data-testid="confirm-approval"]');
      
      // 승인 완료 확인
      await expect(page.locator('[data-testid="swap-approved"]')).toBeVisible();
      
      // 4단계: 스케줄 자동 업데이트 확인
      await page.goto('/schedules/current');
      
      // 교환된 근무 확인
      await expect(page.locator('[data-testid="assignment-2024-01-22-일반간호사4"]')).toBeVisible();
      await expect(page.locator('[data-testid="assignment-2024-01-23-일반간호사1"]')).toBeVisible();
    });

    test('TC049: 교환 후 규칙 재검증', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/swap-validation-test');
      
      // 11시간 휴식 규칙 위반 시나리오 테스트
      await page.fill('[data-testid="employee-a"]', '일반간호사5');
      await page.fill('[data-testid="employee-a-current-shift"]', '2024-01-25 night'); // 22:00-06:00
      await page.fill('[data-testid="employee-a-swap-to"]', '2024-01-26 day'); // 06:00-14:00
      
      await page.fill('[data-testid="employee-b"]', '일반간호사6');
      await page.fill('[data-testid="employee-b-current-shift"]', '2024-01-26 evening'); // 14:00-22:00
      await page.fill('[data-testid="employee-b-swap-to"]', '2024-01-25 off');
      
      await page.click('[data-testid="validate-swap-scenario"]');
      
      // 검증 결과 확인
      const validationResults = page.locator('[data-testid="swap-validation-results"]');
      
      // 직원 A의 휴식시간 위반 감지
      const employeeAViolation = validationResults.locator('[data-testid="employee-a-violations"]');
      await expect(employeeAViolation).toContainText('11시간 최소 휴식 위반');
      await expect(employeeAViolation).toContainText('0시간 휴식'); // 나이트 22:00-06:00 → 데이 06:00-14:00
      
      // 교환 불가 판정 확인
      const swapDecision = await validationResults.locator('[data-testid="swap-decision"]').textContent();
      expect(swapDecision).toContain('교환 불가');
      
      // 대안 제안 확인
      const alternatives = validationResults.locator('[data-testid="alternative-suggestions"]');
      await expect(alternatives).toBeVisible();
      await expect(alternatives).toContainText('다음날 이브닝 교대로 변경 제안');
    });

    test('TC050: 교환 요청 거부 시 대안 제안', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 2);
      
      // 교환 요청 받은 상황에서 거부
      await page.goto('/swaps/received');
      const receivedRequest = page.locator('[data-testid="received-request"]').first();
      
      await receivedRequest.locator('[data-testid="reject-swap"]').click();
      await page.fill('[data-testid="rejection-reason"]', '이미 다른 약속이 있어서 불가능합니다.');
      await page.click('[data-testid="confirm-rejection"]');
      
      // 거부와 함께 대안 제안 기능
      const alternativeSection = page.locator('[data-testid="suggest-alternatives"]');
      await expect(alternativeSection).toBeVisible();
      
      // 대안 날짜 제안
      await page.fill('[data-testid="alternative-date-1"]', '2024-01-28');
      await page.fill('[data-testid="alternative-date-2"]', '2024-01-30');
      await page.fill('[data-testid="alternative-note"]', '이 날짜들은 교환 가능합니다.');
      
      await page.click('[data-testid="send-alternatives"]');
      
      // 대안 제안 전송 확인
      await expect(page.locator('[data-testid="alternatives-sent"]')).toBeVisible();
      
      // 원래 요청자에게 알림 발송 확인
      await helpers.loginAsNurse('staff_nurse', 1);
      await page.goto('/notifications');
      
      const alternativeNotification = page.locator('[data-testid="notification-alternative-suggested"]');
      await expect(alternativeNotification).toBeVisible();
      await expect(alternativeNotification).toContainText('대안 날짜 제안');
    });

    test('TC051: 긴급 교환 요청 처리', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 3);
      await page.goto('/swaps/emergency-request');
      
      // 긴급 교환 요청 (당일 또는 다음날)
      await page.check('[data-testid="emergency-swap"]');
      await page.selectOption('[data-testid="emergency-reason"]', 'family_emergency');
      await page.fill('[data-testid="emergency-details"]', '가족 응급상황으로 즉시 병원 이동 필요');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await page.fill('[data-testid="emergency-shift-date"]', tomorrowStr);
      await page.selectOption('[data-testid="emergency-shift-type"]', 'day');
      
      // 긴급 교환 요청 제출
      await page.click('[data-testid="submit-emergency-swap"]');
      
      // 긴급 요청은 즉시 모든 가능한 대상자에게 알림
      await expect(page.locator('[data-testid="emergency-broadcast-sent"]')).toBeVisible();
      
      // 수간호사에게 즉시 알림 확인
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/notifications');
      
      const emergencyNotification = page.locator('[data-testid="emergency-swap-notification"]');
      await expect(emergencyNotification).toBeVisible();
      await expect(emergencyNotification).toHaveClass(/priority-urgent/);
      
      // 24시간 내 처리 기한 표시 확인
      await expect(emergencyNotification.locator('[data-testid="deadline"]')).toContainText('24시간 내 처리');
      
      // 긴급 승인 권한으로 빠른 처리
      await emergencyNotification.click();
      await page.click('[data-testid="emergency-approve"]');
      
      // 대체 인력 자동 호출 시스템 확인
      await expect(page.locator('[data-testid="on-call-system-activated"]')).toBeVisible();
    });

    test('TC052: 교환 이력 추적 및 감사', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/swap-audit');
      
      // 특정 기간 교환 이력 조회
      await page.fill('[data-testid="audit-start-date"]', '2024-01-01');
      await page.fill('[data-testid="audit-end-date"]', '2024-01-31');
      await page.click('[data-testid="search-swap-history"]');
      
      const auditResults = page.locator('[data-testid="swap-audit-results"]');
      await expect(auditResults).toBeVisible();
      
      // 교환 통계 요약
      const swapSummary = auditResults.locator('[data-testid="swap-summary"]');
      
      const totalSwaps = await swapSummary.locator('[data-testid="total-swaps"]').textContent();
      const approvedSwaps = await swapSummary.locator('[data-testid="approved-swaps"]').textContent();
      const rejectedSwaps = await swapSummary.locator('[data-testid="rejected-swaps"]').textContent();
      const emergencySwaps = await swapSummary.locator('[data-testid="emergency-swaps"]').textContent();
      
      expect(parseInt(totalSwaps || '0')).toBeGreaterThan(0);
      expect(parseInt(approvedSwaps || '0')).toBeGreaterThan(0);
      
      // 상세 감사 로그 확인
      const auditLogs = auditResults.locator('[data-testid="detailed-audit-logs"]');
      const logCount = await auditLogs.locator('[data-testid="audit-log-entry"]').count();
      
      for (let i = 0; i < Math.min(logCount, 5); i++) {
        const logEntry = auditLogs.locator('[data-testid="audit-log-entry"]').nth(i);
        
        // 필수 감사 정보 확인
        await expect(logEntry.locator('[data-testid="timestamp"]')).toBeVisible();
        await expect(logEntry.locator('[data-testid="action-type"]')).toBeVisible();
        await expect(logEntry.locator('[data-testid="involved-users"]')).toBeVisible();
        await expect(logEntry.locator('[data-testid="approval-chain"]')).toBeVisible();
        await expect(logEntry.locator('[data-testid="rule-validation-results"]')).toBeVisible();
      }
      
      // 규칙 위반 시도 기록 확인
      const violationAttempts = auditResults.locator('[data-testid="violation-attempts"]');
      const violationCount = await violationAttempts.locator('[data-testid="violation-entry"]').count();
      
      if (violationCount > 0) {
        const firstViolation = violationAttempts.locator('[data-testid="violation-entry"]').first();
        await expect(firstViolation.locator('[data-testid="violation-type"]')).toBeVisible();
        await expect(firstViolation.locator('[data-testid="prevented-by"]')).toBeVisible();
      }
    });

    test('TC053: 교환 빈도 제한 (월 3회 등)', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 5);
      
      // 이미 3회 교환한 직원의 추가 교환 시도
      for (let i = 1; i <= 4; i++) {
        await page.goto('/swaps/request');
        
        await page.fill('[data-testid="my-shift-date"]', `2024-01-${10 + i * 3}`);
        await page.selectOption('[data-testid="my-shift-type"]', 'day');
        await page.fill('[data-testid="target-employee"]', `일반간호사${6 + (i % 3)}`);
        await page.fill('[data-testid="swap-reason"]', `${i}번째 교환 요청`);
        
        await page.click('[data-testid="submit-swap-request"]');
        
        if (i <= 3) {
          // 처음 3번은 성공
          await expect(page.locator('[data-testid="swap-request-success"]')).toBeVisible();
        } else {
          // 4번째는 월 한도 초과로 실패
          const limitExceededMessage = page.locator('[data-testid="swap-limit-exceeded"]');
          await expect(limitExceededMessage).toBeVisible();
          await expect(limitExceededMessage).toContainText('월 3회 교환 한도 초과');
          await expect(limitExceededMessage).toContainText('다음달 1일부터 다시 요청 가능');
          
          // 특별 승인 요청 옵션 확인
          await expect(page.locator('[data-testid="request-special-approval"]')).toBeVisible();
        }
      }
      
      // 교환 사용 현황 확인
      await page.goto('/profile/swap-usage');
      const usageStats = page.locator('[data-testid="swap-usage-stats"]');
      
      const currentMonthUsage = await usageStats.locator('[data-testid="current-month-usage"]').textContent();
      expect(currentMonthUsage).toContain('3/3');
      
      const remainingSwaps = await usageStats.locator('[data-testid="remaining-swaps"]').textContent();
      expect(remainingSwaps).toContain('0회');
      
      // 과거 사용 이력 확인
      const usageHistory = page.locator('[data-testid="swap-usage-history"]');
      const historyEntries = await usageHistory.locator('[data-testid="usage-entry"]').count();
      expect(historyEntries).toBe(3);
    });

    test('TC054: 팀 간 교환 승인 프로세스', async ({ page }) => {
      // 내과병동 → 외과병동 팀간 교환 시나리오
      await helpers.loginAsNurse('staff_nurse', 1); // 내과병동 간호사
      await page.goto('/swaps/cross-team-request');
      
      await page.fill('[data-testid="target-employee"]', '외과병동간호사1');
      await page.fill('[data-testid="my-shift-date"]', '2024-02-01');
      await page.fill('[data-testid="target-shift-date"]', '2024-02-02');
      await page.selectOption('[data-testid="cross-team-reason"]', 'learning_opportunity');
      await page.fill('[data-testid="detailed-reason"]', '외과 수술 관찰 학습 기회');
      
      await page.click('[data-testid="submit-cross-team-swap"]');
      
      // 팀간 교환은 추가 승인 단계 필요
      await expect(page.locator('[data-testid="cross-team-approval-required"]')).toBeVisible();
      
      // 1단계: 상대방 동의
      await helpers.loginAsNurse('staff_nurse', 10); // 외과병동 간호사
      await page.goto('/swaps/received');
      const crossTeamRequest = page.locator('[data-testid="cross-team-request"]').first();
      await crossTeamRequest.locator('[data-testid="accept-swap"]').click();
      
      // 2단계: 양쪽 팀장 승인 필요
      
      // 내과병동 수간호사 승인
      await helpers.loginAsNurse('head_nurse', 1); // 내과병동 수간호사
      await page.goto('/swaps/cross-team-pending');
      
      const pendingCrossTeamSwap = page.locator('[data-testid="pending-cross-team-swap"]').first();
      await pendingCrossTeamSwap.locator('[data-testid="approve-from-source-team"]').click();
      await page.fill('[data-testid="source-team-comment"]', '학습 기회 제공차 승인');
      await page.click('[data-testid="confirm-source-approval"]');
      
      // 외과병동 수간호사 승인
      await helpers.loginAsNurse('head_nurse', 2); // 외과병동 수간호사
      await page.goto('/swaps/cross-team-pending');
      
      const samePendingSwap = page.locator('[data-testid="pending-cross-team-swap"]').first();
      await samePendingSwap.locator('[data-testid="approve-from-target-team"]').click();
      await page.fill('[data-testid="target-team-comment"]', '경험 공유 차원에서 승인');
      await page.click('[data-testid="confirm-target-approval"]');
      
      // 3단계: 최종 관리자 승인 (필요 시)
      await expect(page.locator('[data-testid="cross-team-swap-approved"]')).toBeVisible();
      
      // 교환 완료 후 양쪽 팀 스케줄 업데이트 확인
      await page.goto('/schedules/current');
      await expect(page.locator('[data-testid="cross-team-assignment-내과병동간호사1-외과병동"]')).toBeVisible();
      await expect(page.locator('[data-testid="cross-team-assignment-외과병동간호사1-내과병동"]')).toBeVisible();
    });

    test('TC055: 교환 취소 및 롤백 기능', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 2);
      
      // 교환 요청 생성
      const swapRequestId = await helpers.requestShiftSwap({
        target_employee: '일반간호사7',
        my_shift_date: '2024-02-05',
        target_shift_date: '2024-02-06',
        reason: '개인 사정'
      });
      
      // 승인 전 요청자가 취소
      await page.goto(`/swaps/${swapRequestId}`);
      await page.click('[data-testid="cancel-swap-request"]');
      await page.fill('[data-testid="cancellation-reason"]', '개인 사정이 해결되어 취소합니다.');
      await page.click('[data-testid="confirm-cancellation"]');
      
      await expect(page.locator('[data-testid="swap-cancelled"]')).toBeVisible();
      
      // 취소 알림 발송 확인
      await helpers.loginAsNurse('staff_nurse', 7);
      await page.goto('/notifications');
      
      const cancellationNotification = page.locator('[data-testid="swap-cancellation-notification"]');
      await expect(cancellationNotification).toBeVisible();
      
      // 승인 후 취소 시나리오 (응급 상황)
      await helpers.loginAsNurse('staff_nurse', 2);
      const emergencySwapId = await helpers.requestShiftSwap({
        target_employee: '일반간호사8',
        my_shift_date: '2024-02-10',
        target_shift_date: '2024-02-11',
        reason: '응급 취소 테스트'
      });
      
      // 빠른 승인 프로세스 (테스트용)
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto(`/swaps/${emergencySwapId}/approve`);
      await page.click('[data-testid="quick-approve"]');
      
      // 승인 후 응급 취소 시도
      await helpers.loginAsNurse('staff_nurse', 2);
      await page.goto(`/swaps/${emergencySwapId}`);
      await page.click('[data-testid="emergency-cancel"]');
      await page.selectOption('[data-testid="emergency-cancel-reason"]', 'family_emergency');
      await page.fill('[data-testid="emergency-details"]', '가족 응급상황 발생');
      
      // 수간호사 승인 필요
      await page.click('[data-testid="request-emergency-cancellation"]');
      
      await expect(page.locator('[data-testid="emergency-cancellation-requested"]')).toBeVisible();
      
      // 수간호사의 응급 취소 승인
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/swaps/emergency-cancellations');
      
      const emergencyCancellation = page.locator('[data-testid="emergency-cancellation"]').first();
      await emergencyCancellation.locator('[data-testid="approve-emergency-cancel"]').click();
      
      // 스케줄 원상복구 확인
      await expect(page.locator('[data-testid="schedule-rollback-complete"]')).toBeVisible();
      
      // 관련 당사자들에게 알림 발송 확인
      await expect(page.locator('[data-testid="cancellation-notifications-sent"]')).toBeVisible();
    });
  });

  test.describe('TC066-085: 휴가 신청 및 승인, 결근 처리 (Phase 4)', () => {
    test('TC066: 연차 휴가 신청 (잔액 확인)', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 1);
      
      const leaveResult = await helpers.submitAndApproveLeave({
        type: 'annual',
        start_date: '2024-02-15',
        end_date: '2024-02-16',
        reason: '가족 여행'
      });
      
      expect(leaveResult.requestId).toBeTruthy();
      
      // 휴가 잔액 확인
      await page.goto('/leaves/balance');
      const balanceWidget = page.locator('[data-testid="leave-balance-widget"]');
      
      const annualLeaveBalance = await balanceWidget.locator('[data-testid="annual-leave-remaining"]').textContent();
      const balanceRemaining = parseInt(annualLeaveBalance?.match(/\d+/)?.[0] || '0');
      
      // 2일 차감되어 13일 남아있어야 함
      expect(balanceRemaining).toBe(13);
      
      // 사용률 표시 확인
      const usageRate = await balanceWidget.locator('[data-testid="annual-leave-usage-rate"]').textContent();
      expect(usageRate).toContain('13%'); // 2/15 = 13.3%
      
      // 휴가 이력 확인
      await page.goto('/leaves/history');
      const latestLeave = page.locator('[data-testid="leave-history-item"]').first();
      await expect(latestLeave.locator('[data-testid="leave-type"]')).toContainText('연차');
      await expect(latestLeave.locator('[data-testid="leave-days"]')).toContainText('2일');
      await expect(latestLeave.locator('[data-testid="leave-status"]')).toContainText('승인 대기');
    });

    test('TC067: 병가 신청 (증명서 첨부)', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 3);
      await page.goto('/leaves/request');
      
      // 병가 신청
      await page.selectOption('[data-testid="leave-type"]', 'sick');
      await page.fill('[data-testid="start-date"]', '2024-02-20');
      await page.fill('[data-testid="end-date"]', '2024-02-20'); // 1일
      await page.fill('[data-testid="reason"]', '급성 위장염으로 인한 병가');
      
      // 의료진단서 첨부 (필수)
      await page.check('[data-testid="requires-medical-certificate"]');
      
      // 파일 업로드 시뮬레이션
      const fileInput = page.locator('[data-testid="medical-certificate-upload"]');
      await fileInput.setInputFiles({
        name: 'medical-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('가짜 의료진단서 PDF 내용')
      });
      
      await page.click('[data-testid="submit-leave-request"]');
      
      // 병가는 당일 신청 시 자동 승인 확인
      await expect(page.locator('[data-testid="sick-leave-auto-approved"]')).toBeVisible();
      
      // 스케줄 자동 조정 확인
      await page.goto('/schedules/current');
      const todayAssignment = page.locator('[data-testid="assignment-2024-02-20-일반간호사3"]');
      await expect(todayAssignment).toContainText('병가');
      
      // 대체 인력 호출 확인
      const replacementAssignment = page.locator('[data-testid="replacement-assignment-2024-02-20"]');
      await expect(replacementAssignment).toBeVisible();
      
      // 의료진단서 첨부 확인
      await page.goto('/leaves/my-requests');
      const sickLeaveRequest = page.locator('[data-testid="sick-leave-request"]').first();
      await expect(sickLeaveRequest.locator('[data-testid="medical-certificate-attached"]')).toBeVisible();
    });

    test('TC068: 개인사유 휴가 신청', async ({ page }) => {
      await helpers.loginAsNurse('charge_nurse', 2);
      
      await helpers.submitAndApproveLeave({
        type: 'personal',
        start_date: '2024-03-01',
        end_date: '2024-03-01',
        reason: '자녀 입학식 참석'
      });
      
      // 개인사유 휴가는 수간호사 승인 필요
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/leaves/pending-approval');
      
      const pendingLeave = page.locator('[data-testid="pending-leave"]').first();
      await expect(pendingLeave.locator('[data-testid="leave-type"]')).toContainText('개인사유');
      await expect(pendingLeave.locator('[data-testid="leave-reason"]')).toContainText('자녀 입학식');
      
      // 최소 인력 확인 후 승인
      const staffingCheck = await pendingLeave.locator('[data-testid="staffing-adequacy"]').textContent();
      expect(staffingCheck).toContain('인력 충족');
      
      await pendingLeave.locator('[data-testid="approve-leave"]').click();
      await page.fill('[data-testid="approval-comment"]', '가족행사 참석 승인');
      await page.click('[data-testid="confirm-approval"]');
      
      // 승인 알림 발송 확인
      await expect(page.locator('[data-testid="approval-notification-sent"]')).toBeVisible();
    });

    test('TC069: 긴급 휴가 자동 승인 테스트', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 4);
      
      const emergencyLeaveResult = await helpers.submitAndApproveLeave({
        type: 'emergency',
        start_date: new Date().toISOString().split('T')[0], // 당일
        end_date: new Date().toISOString().split('T')[0],
        reason: '가족 응급실 이송',
        emergency: true
      });
      
      // 긴급 휴가는 즉시 자동 승인
      await page.goto(`/leaves/${emergencyLeaveResult.requestId}`);
      await expect(page.locator('[data-testid="leave-status"]')).toContainText('자동 승인');
      await expect(page.locator('[data-testid="approval-timestamp"]')).toBeVisible();
      
      // 긴급 대체 인력 호출 시스템 작동 확인
      await expect(page.locator('[data-testid="emergency-replacement-activated"]')).toBeVisible();
      
      // 수간호사에게 사후 알림 확인
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/notifications');
      
      const emergencyLeaveNotification = page.locator('[data-testid="emergency-leave-notification"]');
      await expect(emergencyLeaveNotification).toBeVisible();
      await expect(emergencyLeaveNotification).toHaveClass(/priority-high/);
      
      // 사후 검토 및 승인 취소 권한 확인
      await emergencyLeaveNotification.click();
      await expect(page.locator('[data-testid="post-review-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="revoke-if-invalid"]')).toBeVisible();
    });

    test('TC070: 수간호사 휴가 승인 프로세스', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/leaves/manager-approval');
      
      // 일반 직원 휴가 승인 목록
      const pendingApprovals = page.locator('[data-testid="pending-approvals-list"]');
      const approvalCount = await pendingApprovals.locator('[data-testid="approval-item"]').count();
      
      if (approvalCount > 0) {
        const firstApproval = pendingApprovals.locator('[data-testid="approval-item"]').first();
        
        // 승인 전 검토 사항 확인
        const reviewChecklist = firstApproval.locator('[data-testid="approval-checklist"]');
        await expect(reviewChecklist.locator('[data-testid="staffing-check"]')).toBeVisible();
        await expect(reviewChecklist.locator('[data-testid="coverage-check"]')).toBeVisible();
        await expect(reviewChecklist.locator('[data-testid="balance-check"]')).toBeVisible();
        
        // 각 체크 항목의 상태 확인
        const staffingStatus = await reviewChecklist.locator('[data-testid="staffing-status"]').textContent();
        const coverageStatus = await reviewChecklist.locator('[data-testid="coverage-status"]').textContent();
        const balanceStatus = await reviewChecklist.locator('[data-testid="balance-status"]').textContent();
        
        expect(['충족', '부족']).toContain(staffingStatus);
        expect(['가능', '불가']).toContain(coverageStatus);
        expect(['충분', '부족']).toContain(balanceStatus);
        
        if (staffingStatus === '충족' && coverageStatus === '가능' && balanceStatus === '충분') {
          // 승인 가능한 경우
          await firstApproval.locator('[data-testid="approve-leave"]').click();
          await page.fill('[data-testid="approval-reason"]', '모든 조건을 충족하여 승인');
          await page.click('[data-testid="confirm-approval"]');
          
          await expect(page.locator('[data-testid="leave-approved"]')).toBeVisible();
        } else {
          // 거부 또는 조건부 승인
          if (staffingStatus === '부족') {
            await firstApproval.locator('[data-testid="conditional-approval"]').click();
            await page.fill('[data-testid="condition"]', '대체 인력 확보 시 승인');
            await page.click('[data-testid="set-condition"]');
          }
        }
      }
      
      // 일괄 승인 기능 테스트
      if (approvalCount >= 3) {
        await page.check('[data-testid="select-all-approvable"]');
        await page.click('[data-testid="bulk-approve"]');
        await page.fill('[data-testid="bulk-approval-reason"]', '일괄 승인 처리');
        await page.click('[data-testid="confirm-bulk-approval"]');
        
        await expect(page.locator('[data-testid="bulk-approval-complete"]')).toBeVisible();
      }
    });

    test('TC071: 휴가 중복 신청 방지', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 5);
      
      // 첫 번째 휴가 신청 (2024-03-15~16)
      await page.goto('/leaves/request');
      await page.selectOption('[data-testid="leave-type"]', 'annual');
      await page.fill('[data-testid="start-date"]', '2024-03-15');
      await page.fill('[data-testid="end-date"]', '2024-03-16');
      await page.fill('[data-testid="reason"]', '첫 번째 휴가');
      await page.click('[data-testid="submit-leave-request"]');
      
      await expect(page.locator('[data-testid="leave-request-success"]')).toBeVisible();
      
      // 중복 기간 휴가 신청 시도 (2024-03-16~17, 하루 겹침)
      await page.goto('/leaves/request');
      await page.selectOption('[data-testid="leave-type"]', 'personal');
      await page.fill('[data-testid="start-date"]', '2024-03-16');
      await page.fill('[data-testid="end-date"]', '2024-03-17');
      await page.fill('[data-testid="reason"]', '중복 기간 휴가');
      
      await page.click('[data-testid="submit-leave-request"]');
      
      // 중복 기간 경고 메시지
      const conflictWarning = page.locator('[data-testid="date-conflict-warning"]');
      await expect(conflictWarning).toBeVisible();
      await expect(conflictWarning).toContainText('2024-03-16 기간이 중복');
      await expect(conflictWarning).toContainText('기존 신청: 첫 번째 휴가');
      
      // 중복 해결 옵션 제공
      const resolutionOptions = page.locator('[data-testid="conflict-resolution-options"]');
      await expect(resolutionOptions.locator('[data-testid="modify-dates"]')).toBeVisible();
      await expect(resolutionOptions.locator('[data-testid="cancel-previous"]')).toBeVisible();
      await expect(resolutionOptions.locator('[data-testid="force-submit"]')).toBeVisible(); // 관리자만 가능
      
      // 날짜 수정으로 해결
      await resolutionOptions.locator('[data-testid="modify-dates"]').click();
      await page.fill('[data-testid="new-start-date"]', '2024-03-17');
      await page.fill('[data-testid="new-end-date"]', '2024-03-18');
      await page.click('[data-testid="submit-modified-request"]');
      
      await expect(page.locator('[data-testid="modified-request-success"]')).toBeVisible();
    });

    test('TC072: 최소 인력 확보 시 휴가 제한', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/staffing-analysis');
      
      // 특정 날짜의 최소 인력 상황 시뮬레이션
      const criticalDate = '2024-03-25';
      await page.fill('[data-testid="analysis-date"]', criticalDate);
      await page.click('[data-testid="analyze-staffing"]');
      
      const staffingAnalysis = page.locator('[data-testid="staffing-analysis-result"]');
      
      // 각 교대별 인력 상황 확인
      const dayShiftStaffing = await staffingAnalysis.locator('[data-testid="day-shift-count"]').textContent();
      const eveningShiftStaffing = await staffingAnalysis.locator('[data-testid="evening-shift-count"]').textContent();
      const nightShiftStaffing = await staffingAnalysis.locator('[data-testid="night-shift-count"]').textContent();
      
      const dayCount = parseInt(dayShiftStaffing || '0');
      const eveningCount = parseInt(eveningShiftStaffing || '0');
      const nightCount = parseInt(nightShiftStaffing || '0');
      
      // 최소 인력(3명) 미달 교대가 있는 경우
      if (dayCount < 3 || eveningCount < 3 || nightCount < 3) {
        // 해당 날짜 휴가 신청 제한 설정
        await page.click('[data-testid="set-leave-restriction"]');
        await page.selectOption('[data-testid="restriction-type"]', 'no_new_leaves');
        await page.fill('[data-testid="restriction-reason"]', '최소 인력 미달로 인한 휴가 제한');
        await page.click('[data-testid="apply-restriction"]');
        
        // 일반 직원의 해당 날짜 휴가 신청 시도
        await helpers.loginAsNurse('staff_nurse', 6);
        await page.goto('/leaves/request');
        
        await page.selectOption('[data-testid="leave-type"]', 'annual');
        await page.fill('[data-testid="start-date"]', criticalDate);
        await page.fill('[data-testid="end-date"]', criticalDate);
        await page.fill('[data-testid="reason"]', '제한 날짜 휴가 신청 테스트');
        
        await page.click('[data-testid="submit-leave-request"]');
        
        // 휴가 제한 알림 확인
        const restrictionNotice = page.locator('[data-testid="leave-restriction-notice"]');
        await expect(restrictionNotice).toBeVisible();
        await expect(restrictionNotice).toContainText('최소 인력 미달');
        await expect(restrictionNotice).toContainText('휴가 신청 제한');
        
        // 대안 날짜 제안 확인
        const alternativeDates = page.locator('[data-testid="alternative-dates"]');
        await expect(alternativeDates).toBeVisible();
        
        const suggestionCount = await alternativeDates.locator('[data-testid="suggested-date"]').count();
        expect(suggestionCount).toBeGreaterThan(0);
      }
    });

    test('TC073: 연속 휴가 제한 규칙', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 7);
      
      // 7일 연속 휴가 신청 시도 (최대 5일 제한)
      await page.goto('/leaves/request');
      await page.selectOption('[data-testid="leave-type"]', 'annual');
      await page.fill('[data-testid="start-date"]', '2024-04-01');
      await page.fill('[data-testid="end-date"]', '2024-04-07'); // 7일간
      await page.fill('[data-testid="reason"]', '장기 휴가 신청');
      
      await page.click('[data-testid="submit-leave-request"]');
      
      // 연속 휴가 제한 경고
      const consecutiveLeaveWarning = page.locator('[data-testid="consecutive-leave-warning"]');
      await expect(consecutiveLeaveWarning).toBeVisible();
      await expect(consecutiveLeaveWarning).toContainText('연속 휴가는 최대 5일');
      await expect(consecutiveLeaveWarning).toContainText('7일 신청은 제한 초과');
      
      // 분할 휴가 제안
      const splitLeaveOptions = page.locator('[data-testid="split-leave-options"]');
      await expect(splitLeaveOptions).toBeVisible();
      
      // 옵션 1: 5일 + 2일로 분할 (중간 1일 근무)
      const option1 = splitLeaveOptions.locator('[data-testid="split-option-1"]');
      await expect(option1).toContainText('04-01~04-05 (5일) + 04-07~04-08 (2일)');
      
      // 옵션 2: 특별 승인 요청
      const specialApprovalOption = splitLeaveOptions.locator('[data-testid="special-approval-option"]');
      await expect(specialApprovalOption).toBeVisible();
      
      // 분할 휴가 선택
      await option1.locator('[data-testid="select-split-option"]').click();
      await page.click('[data-testid="submit-split-leave"]');
      
      // 두 개의 별도 휴가 신청으로 처리 확인
      await expect(page.locator('[data-testid="split-leave-created"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-leave-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="second-leave-id"]')).toBeVisible();
      
      // 휴가 목록에서 분할된 휴가들 확인
      await page.goto('/leaves/my-requests');
      const leaveRequests = page.locator('[data-testid="leave-request-item"]');
      const requestCount = await leaveRequests.count();
      
      // 최소 2개의 분할된 요청이 있어야 함
      expect(requestCount).toBeGreaterThanOrEqual(2);
    });

    test('TC074: 피크 시즌 휴가 제한', async ({ page }) => {
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/peak-season-management');
      
      // 피크 시즌 설정 (예: 연말연시)
      await page.click('[data-testid="add-peak-season"]');
      await page.fill('[data-testid="season-name"]', '연말연시');
      await page.fill('[data-testid="season-start"]', '2024-12-20');
      await page.fill('[data-testid="season-end"]', '2024-01-05');
      await page.selectOption('[data-testid="restriction-level"]', 'limited');
      await page.fill('[data-testid="max-concurrent-leaves"]', '2'); // 동시 휴가 최대 2명
      await page.click('[data-testid="save-peak-season"]');
      
      // 피크 시즌 기간 중 휴가 신청 제한 테스트
      await helpers.loginAsNurse('staff_nurse', 8);
      await page.goto('/leaves/request');
      
      await page.selectOption('[data-testid="leave-type"]', 'annual');
      await page.fill('[data-testid="start-date"]', '2024-12-25');
      await page.fill('[data-testid="end-date"]', '2024-12-27');
      await page.fill('[data-testid="reason"]', '크리스마스 휴가');
      
      await page.click('[data-testid="submit-leave-request"]');
      
      // 피크 시즌 알림
      const peakSeasonNotice = page.locator('[data-testid="peak-season-notice"]');
      await expect(peakSeasonNotice).toBeVisible();
      await expect(peakSeasonNotice).toContainText('연말연시 피크 시즌');
      await expect(peakSeasonNotice).toContainText('제한적 승인');
      
      // 현재 신청 상황 표시
      const currentApplications = page.locator('[data-testid="peak-season-applications"]');
      await expect(currentApplications).toContainText('현재 신청: ');
      await expect(currentApplications).toContainText('최대 허용: 2명');
      
      const currentCount = await currentApplications.locator('[data-testid="current-applicant-count"]').textContent();
      const currentApplicants = parseInt(currentCount || '0');
      
      if (currentApplicants >= 2) {
        // 대기 목록 등록
        await expect(page.locator('[data-testid="waitlist-registration"]')).toBeVisible();
        await page.click('[data-testid="join-waitlist"]');
        
        await expect(page.locator('[data-testid="added-to-waitlist"]')).toBeVisible();
      } else {
        // 우선순위 기준으로 검토
        const priorityInfo = page.locator('[data-testid="priority-evaluation"]');
        await expect(priorityInfo).toBeVisible();
        
        await page.click('[data-testid="submit-for-priority-review"]');
        await expect(page.locator('[data-testid="priority-review-submitted"]')).toBeVisible();
      }
    });

    test('TC075: 휴가 취소 및 복원', async ({ page }) => {
      await helpers.loginAsNurse('staff_nurse', 9);
      
      // 휴가 신청
      const leaveResult = await helpers.submitAndApproveLeave({
        type: 'annual',
        start_date: '2024-04-15',
        end_date: '2024-04-16',
        reason: '취소 테스트용 휴가'
      });
      
      // 승인 전 직원 본인이 취소
      await page.goto(`/leaves/${leaveResult.requestId}`);
      
      const leaveStatus = await page.locator('[data-testid="leave-status"]').textContent();
      
      if (leaveStatus?.includes('대기') || leaveStatus?.includes('검토')) {
        // 승인 전 취소 (자유롭게 취소 가능)
        await page.click('[data-testid="cancel-leave-request"]');
        await page.fill('[data-testid="cancellation-reason"]', '개인 사정 변경');
        await page.click('[data-testid="confirm-cancellation"]');
        
        await expect(page.locator('[data-testid="leave-cancelled"]')).toBeVisible();
        
        // 휴가 잔액 복원 확인
        await page.goto('/leaves/balance');
        const restoredBalance = await page.locator('[data-testid="annual-leave-remaining"]').textContent();
        expect(restoredBalance).toContain('15'); // 원래 잔액으로 복원
      }
      
      // 승인 후 취소 시나리오
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/leaves/pending-approval');
      
      if (await page.locator('[data-testid="pending-leave"]').count() > 0) {
        const pendingLeave = page.locator('[data-testid="pending-leave"]').first();
        await pendingLeave.locator('[data-testid="approve-leave"]').click();
        await page.click('[data-testid="confirm-approval"]');
        
        const approvedLeaveId = await page.locator('[data-testid="approved-leave-id"]').textContent();
        
        // 직원이 승인된 휴가 취소 시도 (제한적)
        await helpers.loginAsNurse('staff_nurse', 9);
        await page.goto(`/leaves/${approvedLeaveId}`);
        
        await page.click('[data-testid="request-cancellation"]');
        await page.selectOption('[data-testid="cancellation-category"]', 'emergency');
        await page.fill('[data-testid="emergency-reason"]', '가족 응급상황으로 출근 필요');
        await page.click('[data-testid="submit-cancellation-request"]');
        
        // 관리자 승인 필요 알림
        await expect(page.locator('[data-testid="cancellation-approval-required"]')).toBeVisible();
        
        // 관리자의 취소 승인 프로세스
        await helpers.loginAsNurse('head_nurse', 1);
        await page.goto('/leaves/cancellation-requests');
        
        const cancellationRequest = page.locator('[data-testid="cancellation-request"]').first();
        await cancellationRequest.locator('[data-testid="approve-cancellation"]').click();
        
        // 스케줄 복원 및 대체 인력 취소 확인
        await expect(page.locator('[data-testid="schedule-restored"]')).toBeVisible();
        await expect(page.locator('[data-testid="replacement-cancelled"]')).toBeVisible();
        
        // 휴가 잔액 복원 확인
        await expect(page.locator('[data-testid="balance-restored"]')).toBeVisible();
      }
    });

    test('TC076-085: 결근 및 응급 상황 처리', async ({ page }) => {
      // TC076: 당일 병가 처리 (응급)
      await helpers.loginAsNurse('staff_nurse', 10);
      await page.goto('/leaves/emergency-sick-leave');
      
      const today = new Date().toISOString().split('T')[0];
      
      // 당일 응급 병가 신청
      await page.fill('[data-testid="sick-leave-date"]', today);
      await page.selectOption('[data-testid="sick-leave-reason"]', 'sudden_illness');
      await page.fill('[data-testid="symptoms"]', '고열과 구토 증상');
      await page.check('[data-testid="emergency-sick-leave"]');
      
      await page.click('[data-testid="submit-emergency-sick-leave"]');
      
      // 즉시 승인 및 알림 발송 확인
      await expect(page.locator('[data-testid="emergency-sick-approved"]')).toBeVisible();
      await expect(page.locator('[data-testid="team-notified"]')).toBeVisible();
      
      // TC077: 무단결근 처리 및 알림
      await helpers.loginAsNurse('head_nurse', 1);
      await page.goto('/admin/attendance-monitoring');
      
      // 현재 시간 기준으로 출근하지 않은 직원 확인
      await page.click('[data-testid="check-no-show"]');
      
      const noShowList = page.locator('[data-testid="no-show-employees"]');
      const noShowCount = await noShowList.locator('[data-testid="no-show-employee"]').count();
      
      if (noShowCount > 0) {
        const firstNoShow = noShowList.locator('[data-testid="no-show-employee"]').first();
        const employeeName = await firstNoShow.locator('[data-testid="employee-name"]').textContent();
        
        // 무단결근 처리
        await firstNoShow.locator('[data-testid="mark-no-show"]').click();
        await page.fill('[data-testid="no-show-note"]', '연락 없이 출근하지 않음');
        await page.click('[data-testid="confirm-no-show"]');
        
        // 자동 대체 인력 호출 확인
        await expect(page.locator('[data-testid="replacement-call-initiated"]')).toBeVisible();
        
        // 무단결근 직원에게 연락 시도 기록
        await expect(page.locator('[data-testid="contact-attempts-logged"]')).toBeVisible();
      }
      
      // TC078: 대체 인력 자동 호출
      const replacementSystem = page.locator('[data-testid="replacement-system"]');
      await expect(replacementSystem).toBeVisible();
      
      // 호출 우선순위 확인
      const callPriority = replacementSystem.locator('[data-testid="call-priority-list"]');
      const priorityCount = await callPriority.locator('[data-testid="priority-employee"]').count();
      expect(priorityCount).toBeGreaterThan(0);
      
      // 첫 번째 우선순위 직원에게 호출
      const firstPriority = callPriority.locator('[data-testid="priority-employee"]').first();
      await firstPriority.locator('[data-testid="call-employee"]').click();
      
      await expect(page.locator('[data-testid="call-sent"]')).toBeVisible();
      
      // TC079-085는 추가 응급 상황 처리 로직들로 구성
      // (환자 급증, 감염 격리, 장기 병가, 복직, 의료진 안전, 감염병 대응, 결근 패턴 분석)
    });
  });
});