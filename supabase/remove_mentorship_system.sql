-- 멘토링 시스템 완전 제거 스크립트
-- 실행 전 반드시 데이터 백업 권장

BEGIN;

-- 1. 멘토링 관련 뷰 제거
DROP VIEW IF EXISTS active_mentorships;

-- 2. 멘토링 관련 함수 제거
DROP FUNCTION IF EXISTS get_mentor_current_mentees(UUID);
DROP FUNCTION IF EXISTS suggest_mentor_for_mentee(UUID, UUID);
DROP FUNCTION IF EXISTS update_mentorship_updated_at();

-- 3. 멘토링 관련 트리거 제거
DROP TRIGGER IF EXISTS update_mentorship_relationships_updated_at ON mentorship_relationships;
DROP TRIGGER IF EXISTS update_mentoring_requirements_updated_at ON mentoring_requirements;

-- 4. 멘토링 관련 테이블 제거 (의존성 순서 고려)
-- 가장 의존적인 테이블부터 제거

-- 멘토십 스케줄 페어링 로그
DROP TABLE IF EXISTS mentorship_schedule_pairings CASCADE;

-- 멘토십 성과 추적
DROP TABLE IF EXISTS mentorship_metrics CASCADE;

-- 멘토링 요구사항 설정
DROP TABLE IF EXISTS mentoring_requirements CASCADE;

-- 멘토십 관계 (메인 테이블)
DROP TABLE IF EXISTS mentorship_relationships CASCADE;

-- 5. 기존 테이블에서 멘토링 관련 컬럼 제거 확인
-- (현재 스키마 분석 결과, 다른 테이블에는 멘토링 직접 참조가 없음을 확인)

-- 6. 감사 로그에서 멘토링 관련 기록 정리 (선택적)
-- 필요시 주석 해제:
-- DELETE FROM audit_logs WHERE action LIKE '%mentorship%' OR action LIKE '%mentor%';

-- 7. 확인 쿼리 (실행 후 결과 확인용)
-- 다음 쿼리들은 모두 빈 결과나 오류를 반환해야 함
DO $$
BEGIN
    -- 멘토링 테이블이 모두 제거되었는지 확인
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'mentorship_relationships', 
            'mentoring_requirements', 
            'mentorship_metrics', 
            'mentorship_schedule_pairings'
        )
    ) THEN
        RAISE EXCEPTION '멘토링 테이블이 완전히 제거되지 않았습니다.';
    END IF;

    -- 멘토링 관련 함수가 모두 제거되었는지 확인
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name IN (
            'get_mentor_current_mentees',
            'suggest_mentor_for_mentee',
            'update_mentorship_updated_at'
        )
    ) THEN
        RAISE EXCEPTION '멘토링 관련 함수가 완전히 제거되지 않았습니다.';
    END IF;

    RAISE NOTICE '멘토링 시스템이 성공적으로 제거되었습니다.';
END $$;

COMMIT;

-- 실행 결과 확인
SELECT 
    COUNT(*) as remaining_mentorship_tables
FROM information_schema.tables 
WHERE table_name LIKE '%mentor%';

-- 0이 반환되어야 정상