-- Phase 2 완료: Realtime 구독 및 Storage 버킷 설정
-- Supabase Dashboard SQL Editor에서 실행

-- =====================================================
-- REALTIME 구독 설정
-- =====================================================

-- 1. notifications 테이블에 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. schedule_assignments 테이블에 실시간 구독 활성화 (스케줄 변경 감지)
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_assignments;

-- 3. swap_requests 테이블에 실시간 구독 활성화 (교환 요청 감지)
ALTER PUBLICATION supabase_realtime ADD TABLE swap_requests;

-- 4. leaves 테이블에 실시간 구독 활성화 (휴가 요청 감지)
ALTER PUBLICATION supabase_realtime ADD TABLE leaves;

-- =====================================================
-- STORAGE 버킷 설정
-- =====================================================

-- Storage 버킷은 Dashboard에서 생성해야 합니다
-- Dashboard > Storage > New Bucket으로 다음 버킷들을 생성하세요:

-- 1. avatars (프로필 이미지)
--    - Public: Yes
--    - File size limit: 2MB
--    - Allowed MIME types: image/*

-- 2. documents (문서 파일)
--    - Public: No
--    - File size limit: 10MB
--    - Allowed MIME types: application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

-- 3. exports (내보내기 파일)
--    - Public: No
--    - File size limit: 50MB
--    - Allowed MIME types: *

-- Storage 정책 (Dashboard에서 설정 또는 아래 SQL 실행)
-- 이 쿼리들은 버킷 생성 후 실행하세요

-- avatars 버킷 정책
-- INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
-- VALUES 
--   ('avatars', 'Avatar images are publicly accessible', 
--    '{"select": true}', NULL),
--   ('avatars', 'Users can upload their own avatar', 
--    '{"insert": true, "update": true}', 
--    'auth.uid() = owner_id');

-- documents 버킷 정책  
-- INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
-- VALUES
--   ('documents', 'Users can view documents in their tenant',
--    '{"select": true}',
--    'auth.uid() IN (SELECT auth_user_id FROM employees WHERE tenant_id = metadata->>"tenant_id")'),
--   ('documents', 'Managers can upload documents',
--    '{"insert": true, "update": true, "delete": true}',
--    'auth.uid() IN (SELECT auth_user_id FROM employees WHERE role IN ("admin", "manager"))');

-- =====================================================
-- EDGE FUNCTIONS 준비 (선택사항)
-- =====================================================

-- Edge Functions를 위한 secrets 저장
-- Dashboard > Settings > Secrets에서 설정하세요:
-- - RESEND_API_KEY: 이메일 발송용
-- - KAKAO_BIZ_API_KEY: 카카오톡 알림용
-- - GOOGLE_CALENDAR_API_KEY: 구글 캘린더 연동용

-- =====================================================
-- 확인 쿼리
-- =====================================================

-- Realtime이 활성화된 테이블 확인
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 성공 메시지
SELECT 'Phase 2 완료: Realtime 구독 설정 완료!' as message;