-- 멘토-멘티 관계 관리 스키마

-- 멘토십 관계 테이블
CREATE TABLE IF NOT EXISTS mentorship_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  mentorship_type VARCHAR(30) NOT NULL DEFAULT 'onboarding' CHECK (mentorship_type IN ('onboarding', 'skill_development', 'leadership', 'general')),
  pairing_strength INTEGER NOT NULL DEFAULT 7 CHECK (pairing_strength >= 1 AND pairing_strength <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  
  -- 제약사항
  CONSTRAINT unique_active_mentorship UNIQUE (mentee_id, status) WHERE status = 'active',
  CONSTRAINT different_mentor_mentee CHECK (mentor_id != mentee_id)
);

-- 멘토링 요구사항 설정 테이블
CREATE TABLE IF NOT EXISTS mentoring_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  min_level_difference INTEGER NOT NULL DEFAULT 1,
  same_shift_required BOOLEAN NOT NULL DEFAULT true,
  max_mentees_per_mentor INTEGER NOT NULL DEFAULT 3,
  pairing_duration_days INTEGER NOT NULL DEFAULT 30,
  min_overlap_hours INTEGER NOT NULL DEFAULT 6,
  auto_pairing_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- 테넌트당 하나의 설정만 허용
  CONSTRAINT one_requirement_per_tenant UNIQUE (tenant_id)
);

-- 멘토십 성과 추적 테이블
CREATE TABLE IF NOT EXISTS mentorship_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES mentorship_relationships(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mentee_skill_improvement INTEGER CHECK (mentee_skill_improvement >= 0 AND mentee_skill_improvement <= 100),
  mentee_confidence_level INTEGER CHECK (mentee_confidence_level >= 0 AND mentee_confidence_level <= 10),
  mentee_independence_score INTEGER CHECK (mentee_independence_score >= 0 AND mentee_independence_score <= 10),
  mentor_effectiveness INTEGER CHECK (mentor_effectiveness >= 0 AND mentor_effectiveness <= 10),
  mentor_time_investment DECIMAL(5,2), -- hours
  mentor_satisfaction INTEGER CHECK (mentor_satisfaction >= 0 AND mentor_satisfaction <= 10),
  pairing_success_rate INTEGER CHECK (pairing_success_rate >= 0 AND pairing_success_rate <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id)
);

-- 멘토십 스케줄 페어링 로그 테이블
CREATE TABLE IF NOT EXISTS mentorship_schedule_pairings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  relationship_id UUID NOT NULL REFERENCES mentorship_relationships(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  shift_type VARCHAR(20) NOT NULL,
  is_paired BOOLEAN NOT NULL DEFAULT false,
  pairing_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- 날짜별 중복 방지
  CONSTRAINT unique_pairing_per_day UNIQUE (relationship_id, schedule_date)
);

-- 인덱스 생성
CREATE INDEX idx_mentorship_mentor ON mentorship_relationships(mentor_id);
CREATE INDEX idx_mentorship_mentee ON mentorship_relationships(mentee_id);
CREATE INDEX idx_mentorship_status ON mentorship_relationships(status);
CREATE INDEX idx_mentorship_tenant ON mentorship_relationships(tenant_id);
CREATE INDEX idx_mentorship_dates ON mentorship_relationships(start_date, end_date);
CREATE INDEX idx_mentorship_pairings_date ON mentorship_schedule_pairings(schedule_date);
CREATE INDEX idx_mentorship_pairings_relationship ON mentorship_schedule_pairings(relationship_id);

-- RLS 정책
ALTER TABLE mentorship_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentoring_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_schedule_pairings ENABLE ROW LEVEL SECURITY;

-- 멘토십 관계 RLS 정책
CREATE POLICY "Users can view mentorships in their tenant" ON mentorship_relationships
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage mentorships" ON mentorship_relationships
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 멘토링 요구사항 RLS 정책
CREATE POLICY "Users can view mentoring requirements" ON mentoring_requirements
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage mentoring requirements" ON mentoring_requirements
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM employees 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_mentorship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mentorship_relationships_updated_at
  BEFORE UPDATE ON mentorship_relationships
  FOR EACH ROW EXECUTE FUNCTION update_mentorship_updated_at();

CREATE TRIGGER update_mentoring_requirements_updated_at
  BEFORE UPDATE ON mentoring_requirements
  FOR EACH ROW EXECUTE FUNCTION update_mentorship_updated_at();

-- 뷰: 활성 멘토십 관계 조회
CREATE OR REPLACE VIEW active_mentorships AS
SELECT 
  mr.*,
  mentor.name as mentor_name,
  mentor.level as mentor_level,
  mentee.name as mentee_name,
  mentee.level as mentee_level,
  CURRENT_DATE - mr.start_date as days_active
FROM mentorship_relationships mr
JOIN employees mentor ON mr.mentor_id = mentor.id
JOIN employees mentee ON mr.mentee_id = mentee.id
WHERE mr.status = 'active';

-- 함수: 멘토의 현재 멘티 수 계산
CREATE OR REPLACE FUNCTION get_mentor_current_mentees(p_mentor_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM mentorship_relationships
    WHERE mentor_id = p_mentor_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- 함수: 멘토십 자동 매칭 추천
CREATE OR REPLACE FUNCTION suggest_mentor_for_mentee(
  p_mentee_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  mentor_id UUID,
  mentor_name VARCHAR,
  mentor_level INTEGER,
  compatibility_score INTEGER,
  current_mentees INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as mentor_id,
    e.name as mentor_name,
    e.level as mentor_level,
    -- 간단한 호환성 점수 계산 (레벨 차이 기반)
    CASE 
      WHEN e.level - (SELECT level FROM employees WHERE id = p_mentee_id) BETWEEN 1 AND 2 THEN 90
      WHEN e.level - (SELECT level FROM employees WHERE id = p_mentee_id) = 3 THEN 70
      ELSE 50
    END as compatibility_score,
    get_mentor_current_mentees(e.id) as current_mentees
  FROM employees e
  WHERE e.tenant_id = p_tenant_id
  AND e.id != p_mentee_id
  AND e.level > (SELECT level FROM employees WHERE id = p_mentee_id)
  AND e.is_active = true
  AND get_mentor_current_mentees(e.id) < (
    SELECT COALESCE(max_mentees_per_mentor, 3)
    FROM mentoring_requirements
    WHERE tenant_id = p_tenant_id
  )
  ORDER BY compatibility_score DESC, current_mentees ASC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;