-- 테넌트 테이블에 업종 타입 추가
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS industry_type VARCHAR(50) DEFAULT 'general';

-- 업종 타입 enum 값들
COMMENT ON COLUMN tenants.industry_type IS 'Industry type: general, healthcare_nursing, manufacturing, retail, hospitality, etc.';

-- 기존 테넌트들을 일반 업종으로 설정
UPDATE tenants SET industry_type = 'general' WHERE industry_type IS NULL;

-- 업종별 설정 테이블 생성
CREATE TABLE IF NOT EXISTS industry_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    industry_type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- RLS 정책 적용
ALTER TABLE industry_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's industry config"
    ON industry_configurations FOR SELECT
    USING (
        tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage industry config"
    ON industry_configurations FOR ALL
    USING (
        tenant_id IN (
            SELECT e.tenant_id 
            FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'admin'
        )
    );

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_tenants_industry_type ON tenants(industry_type);
CREATE INDEX IF NOT EXISTS idx_industry_configurations_tenant_id ON industry_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_industry_configurations_industry_type ON industry_configurations(industry_type);