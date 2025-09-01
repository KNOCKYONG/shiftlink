-- 스케줄 공유 테이블
CREATE TABLE IF NOT EXISTS schedule_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 공유 정보
  share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  share_type VARCHAR(20) DEFAULT 'view' CHECK (share_type IN ('view', 'download', 'subscribe')),
  
  -- 접근 제어
  created_by UUID NOT NULL REFERENCES employees(id),
  allowed_viewers UUID[] DEFAULT NULL, -- NULL이면 모든 사람 접근 가능
  require_password BOOLEAN DEFAULT false,
  password_hash TEXT DEFAULT NULL,
  
  -- 만료 및 상태
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ DEFAULT NULL,
  deactivated_by UUID REFERENCES employees(id),
  
  -- 설정
  include_personal_info BOOLEAN DEFAULT false, -- 개인정보 포함 여부
  allow_download BOOLEAN DEFAULT true,
  allow_calendar_sync BOOLEAN DEFAULT true,
  
  -- 통계
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NULL,
  
  -- 메타데이터
  description TEXT DEFAULT NULL,
  custom_title TEXT DEFAULT NULL
);

-- 공유 접근 로그 테이블
CREATE TABLE IF NOT EXISTS share_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES schedule_shares(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 접근 정보
  action VARCHAR(20) DEFAULT 'view' CHECK (action IN ('view', 'download', 'subscribe')),
  user_agent TEXT,
  ip_address INET,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 추가 데이터
  referrer TEXT,
  session_id TEXT,
  response_size INTEGER,
  response_time_ms INTEGER
);

-- 스케줄 버전 히스토리 확장
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS shared_count INTEGER DEFAULT 0;
ALTER TABLE schedule_versions ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMPTZ DEFAULT NULL;

-- 인덱스 생성
CREATE INDEX idx_schedule_shares_token ON schedule_shares(share_token);
CREATE INDEX idx_schedule_shares_schedule ON schedule_shares(schedule_id);
CREATE INDEX idx_schedule_shares_tenant ON schedule_shares(tenant_id);
CREATE INDEX idx_schedule_shares_active ON schedule_shares(is_active, expires_at);
CREATE INDEX idx_share_access_logs_share ON share_access_logs(share_id);
CREATE INDEX idx_share_access_logs_accessed ON share_access_logs(accessed_at);

-- RLS 정책 설정
ALTER TABLE schedule_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- 공유 조회: 같은 테넌트의 직원들만
CREATE POLICY "Users can view their tenant's schedule shares" ON schedule_shares
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT e.tenant_id 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid()
    )
  );

-- 공유 생성/수정: 관리자/매니저만
CREATE POLICY "Only admins and managers can manage schedule shares" ON schedule_shares
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM employees e 
      WHERE e.auth_user_id = auth.uid() 
        AND e.tenant_id = schedule_shares.tenant_id 
        AND e.role IN ('admin', 'manager')
    )
  );

-- 접근 로그는 시스템에서만 관리 (사용자 직접 접근 불가)
CREATE POLICY "System only access to share logs" ON share_access_logs
  FOR ALL
  USING (false);

-- 만료된 공유 자동 비활성화 함수
CREATE OR REPLACE FUNCTION deactivate_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE schedule_shares 
  SET 
    is_active = false,
    deactivated_at = NOW()
  WHERE 
    is_active = true 
    AND expires_at < NOW();
    
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 공유 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_share_statistics()
RETURNS VOID AS $$
BEGIN
  -- 스케줄 버전에 공유 통계 업데이트
  UPDATE schedule_versions sv
  SET 
    shared_count = (
      SELECT COUNT(*)
      FROM schedule_shares ss
      WHERE ss.schedule_id = sv.schedule_id
        AND ss.is_active = true
    ),
    last_shared_at = (
      SELECT MAX(ss.created_at)
      FROM schedule_shares ss
      WHERE ss.schedule_id = sv.schedule_id
        AND ss.is_active = true
    )
  WHERE sv.id IN (
    SELECT DISTINCT sv2.id
    FROM schedule_versions sv2
    JOIN schedule_shares ss ON ss.schedule_id = sv2.schedule_id
    WHERE ss.created_at > sv2.created_at - INTERVAL '1 hour'
  );
END;
$$ LANGUAGE plpgsql;

-- 공유 토큰 검증 함수
CREATE OR REPLACE FUNCTION validate_share_token(p_token UUID)
RETURNS TABLE (
  share_id UUID,
  schedule_id UUID,
  tenant_id UUID,
  share_type VARCHAR,
  require_password BOOLEAN,
  include_personal_info BOOLEAN,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.schedule_id,
    ss.tenant_id,
    ss.share_type,
    ss.require_password,
    ss.include_personal_info,
    CASE 
      WHEN NOT ss.is_active THEN false
      WHEN ss.expires_at < NOW() THEN false
      ELSE true
    END as is_valid,
    CASE 
      WHEN NOT ss.is_active THEN 'Share has been deactivated'
      WHEN ss.expires_at < NOW() THEN 'Share has expired'
      ELSE NULL
    END as error_message
  FROM schedule_shares ss
  WHERE ss.share_token = p_token;
  
  -- 레코드가 없으면 기본값 반환
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::VARCHAR,
      false,
      false,
      false,
      'Share not found'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 공유 생성 시 통계 업데이트
CREATE OR REPLACE FUNCTION trigger_update_share_statistics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_share_statistics();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_share_stats_on_insert
  AFTER INSERT ON schedule_shares
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_share_statistics();

-- 정리용 함수들
CREATE OR REPLACE FUNCTION cleanup_old_access_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM share_access_logs 
  WHERE accessed_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 샘플 데이터나 초기 설정이 필요한 경우
-- CREATE OR REPLACE FUNCTION setup_default_share_settings()
-- RETURNS VOID AS $$
-- BEGIN
--   -- 기본 공유 설정 등을 여기서 초기화
--   NULL;
-- END;
-- $$ LANGUAGE plpgsql;