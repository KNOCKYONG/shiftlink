-- 시간대별 설정 테이블 생성
CREATE TABLE IF NOT EXISTS shift_time_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('day', 'evening', 'night', 'off')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    color_scheme JSONB NOT NULL,
    korean_terms JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, team_id, shift_type)
);

-- 시간 설정 업데이트 트리거
CREATE OR REPLACE FUNCTION update_shift_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shift_settings_timestamp
    BEFORE UPDATE ON shift_time_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_shift_settings_timestamp();

-- RLS 정책
ALTER TABLE shift_time_settings ENABLE ROW LEVEL SECURITY;

-- 조직 멤버는 조회 가능
CREATE POLICY "Organization members can view shift settings" ON shift_time_settings
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM employees 
            WHERE id = auth.uid()
        )
    );

-- 관리자만 수정 가능
CREATE POLICY "Admins can modify shift settings" ON shift_time_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND tenant_id = shift_time_settings.tenant_id
            AND role IN ('admin', 'manager')
        )
    );

-- 인덱스 생성
CREATE INDEX idx_shift_settings_tenant_team ON shift_time_settings(tenant_id, team_id);
CREATE INDEX idx_shift_settings_type ON shift_time_settings(shift_type);
CREATE INDEX idx_shift_settings_active ON shift_time_settings(is_active) WHERE is_active = true;