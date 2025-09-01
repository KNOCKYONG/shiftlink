-- ==============================================
-- Monitoring & Analytics Schema for ShiftLink
-- ==============================================
-- Purpose: Track work hours, fatigue, performance metrics
-- Phase 8: Monitoring & Reports Implementation
-- ==============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS fatigue_metrics CASCADE;
DROP TABLE IF EXISTS work_time_aggregations CASCADE;
DROP TABLE IF EXISTS shift_statistics CASCADE;
DROP TABLE IF EXISTS team_balance_reports CASCADE;
DROP TABLE IF EXISTS performance_indicators CASCADE;
DROP TABLE IF EXISTS alert_thresholds CASCADE;
DROP TABLE IF EXISTS monitoring_alerts CASCADE;

-- ==============================================
-- 1. WORK TIME AGGREGATIONS
-- ==============================================
-- 직원별 근무시간 집계 (일별, 주별, 월별)

CREATE TABLE IF NOT EXISTS work_time_aggregations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Aggregation period
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Work hours breakdown
  total_hours DECIMAL(5,2) DEFAULT 0,
  regular_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  night_hours DECIMAL(5,2) DEFAULT 0,
  weekend_hours DECIMAL(5,2) DEFAULT 0,
  holiday_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Shift counts
  total_shifts INTEGER DEFAULT 0,
  day_shifts INTEGER DEFAULT 0,
  evening_shifts INTEGER DEFAULT 0,
  night_shifts INTEGER DEFAULT 0,
  
  -- Leave and absence
  leave_days INTEGER DEFAULT 0,
  absence_days INTEGER DEFAULT 0,
  
  -- Compliance metrics
  weekly_limit_violations INTEGER DEFAULT 0,  -- 주 52시간 초과 횟수
  rest_time_violations INTEGER DEFAULT 0,     -- 최소 휴식시간 위반
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(employee_id, period_type, period_start)
);

-- ==============================================
-- 2. FATIGUE METRICS
-- ==============================================
-- 피로도 지표 추적

CREATE TABLE IF NOT EXISTS fatigue_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  calculation_date DATE NOT NULL,
  
  -- Fatigue indicators
  fatigue_score DECIMAL(3,2) NOT NULL CHECK (fatigue_score BETWEEN 0 AND 10),
  consecutive_night_shifts INTEGER DEFAULT 0,
  consecutive_work_days INTEGER DEFAULT 0,
  hours_worked_7days DECIMAL(5,2) DEFAULT 0,
  hours_worked_30days DECIMAL(6,2) DEFAULT 0,
  
  -- Risk levels
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  
  -- Contributing factors
  factors JSONB DEFAULT '{}',
  /* Example factors:
  {
    "night_shift_ratio": 0.4,
    "overtime_ratio": 0.2,
    "rest_time_average": 10.5,
    "shift_pattern_changes": 3,
    "weekend_work_count": 2
  }
  */
  
  -- Recommendations
  recommendations TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(employee_id, calculation_date)
);

-- ==============================================
-- 3. SHIFT STATISTICS
-- ==============================================
-- 교대 근무 통계

CREATE TABLE IF NOT EXISTS shift_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Statistics period
  stat_date DATE NOT NULL,
  stat_type VARCHAR(20) NOT NULL CHECK (stat_type IN ('daily', 'weekly', 'monthly')),
  
  -- Coverage metrics
  total_positions INTEGER DEFAULT 0,
  filled_positions INTEGER DEFAULT 0,
  coverage_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Shift distribution
  shift_distribution JSONB DEFAULT '{}',
  /* Example:
  {
    "day": {"count": 10, "percentage": 33.3},
    "evening": {"count": 10, "percentage": 33.3},
    "night": {"count": 10, "percentage": 33.3}
  }
  */
  
  -- Swap and change metrics
  swap_requests_count INTEGER DEFAULT 0,
  swap_approval_rate DECIMAL(5,2) DEFAULT 0,
  last_minute_changes INTEGER DEFAULT 0,
  
  -- Compliance metrics
  compliance_score DECIMAL(5,2) DEFAULT 100,
  violations JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, team_id, stat_date, stat_type)
);

-- ==============================================
-- 4. TEAM BALANCE REPORTS
-- ==============================================
-- 팀별 숙련도/연차 균형 리포트

CREATE TABLE IF NOT EXISTS team_balance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  report_date DATE NOT NULL,
  report_type VARCHAR(20) CHECK (report_type IN ('weekly', 'monthly', 'quarterly')),
  
  -- Team composition
  total_members INTEGER DEFAULT 0,
  
  -- Seniority distribution
  seniority_distribution JSONB DEFAULT '{}',
  /* Example:
  {
    "junior": {"count": 5, "percentage": 25},
    "intermediate": {"count": 10, "percentage": 50},
    "senior": {"count": 4, "percentage": 20},
    "lead": {"count": 1, "percentage": 5}
  }
  */
  
  -- Skill level metrics
  average_skill_level DECIMAL(3,2) DEFAULT 0,
  skill_diversity_index DECIMAL(3,2) DEFAULT 0,
  
  -- Balance scores
  seniority_balance_score DECIMAL(5,2) DEFAULT 0,  -- 0-100
  skill_balance_score DECIMAL(5,2) DEFAULT 0,      -- 0-100
  shift_balance_score DECIMAL(5,2) DEFAULT 0,      -- 0-100
  overall_balance_score DECIMAL(5,2) DEFAULT 0,    -- 0-100
  
  -- Shift coverage by seniority
  shift_coverage JSONB DEFAULT '{}',
  /* Example:
  {
    "day": {"senior": 2, "junior": 3},
    "evening": {"senior": 1, "junior": 4},
    "night": {"senior": 1, "junior": 2}
  }
  */
  
  -- Recommendations
  imbalances JSONB DEFAULT '[]',
  recommendations TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(team_id, report_date, report_type)
);

-- ==============================================
-- 5. PERFORMANCE INDICATORS (KPIs)
-- ==============================================

CREATE TABLE IF NOT EXISTS performance_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  indicator_date DATE NOT NULL,
  indicator_type VARCHAR(50) NOT NULL,
  
  -- KPI values
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit VARCHAR(20),
  
  -- Targets and thresholds
  target_value DECIMAL(10,2),
  min_threshold DECIMAL(10,2),
  max_threshold DECIMAL(10,2),
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('good', 'warning', 'critical')),
  trend VARCHAR(20) CHECK (trend IN ('improving', 'stable', 'declining')),
  
  -- Context
  context JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- 6. ALERT THRESHOLDS
-- ==============================================

CREATE TABLE IF NOT EXISTS alert_thresholds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  metric_type VARCHAR(50) NOT NULL,
  threshold_name VARCHAR(100) NOT NULL,
  
  -- Threshold values
  warning_threshold DECIMAL(10,2),
  critical_threshold DECIMAL(10,2),
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  check_frequency VARCHAR(20) DEFAULT 'daily', -- realtime, hourly, daily, weekly
  
  -- Notification settings
  notify_roles TEXT[] DEFAULT ARRAY['admin', 'manager'],
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, metric_type, threshold_name)
);

-- ==============================================
-- 7. MONITORING ALERTS
-- ==============================================

CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- What triggered the alert
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  
  -- Who/what is affected
  affected_entity_type VARCHAR(50), -- employee, team, shift, etc.
  affected_entity_id UUID,
  
  -- Alert content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_by UUID REFERENCES employees(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES employees(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to calculate fatigue score
CREATE OR REPLACE FUNCTION calculate_fatigue_score(
  p_employee_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL(3,2) := 0;
  v_consecutive_nights INTEGER;
  v_consecutive_days INTEGER;
  v_hours_7days DECIMAL;
  v_hours_30days DECIMAL;
  v_night_ratio DECIMAL;
BEGIN
  -- Get consecutive night shifts
  SELECT COUNT(*)
  INTO v_consecutive_nights
  FROM schedule_assignments sa
  JOIN schedules s ON sa.schedule_id = s.id
  WHERE sa.employee_id = p_employee_id
    AND sa.shift_type = 'night'
    AND s.schedule_date <= p_date
    AND s.schedule_date > p_date - INTERVAL '7 days';
  
  -- Get consecutive work days
  SELECT COUNT(DISTINCT s.schedule_date)
  INTO v_consecutive_days
  FROM schedule_assignments sa
  JOIN schedules s ON sa.schedule_id = s.id
  WHERE sa.employee_id = p_employee_id
    AND sa.shift_type != 'off'
    AND s.schedule_date <= p_date
    AND s.schedule_date > p_date - INTERVAL '14 days';
  
  -- Calculate fatigue score (simplified algorithm)
  v_score := LEAST(10, 
    (v_consecutive_nights * 1.5) + 
    (GREATEST(0, v_consecutive_days - 5) * 0.5) +
    (CASE WHEN v_hours_7days > 52 THEN 2 ELSE 0 END) +
    (CASE WHEN v_hours_30days > 200 THEN 1 ELSE 0 END)
  );
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate work time
CREATE OR REPLACE FUNCTION aggregate_work_time(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  total_hours DECIMAL,
  regular_hours DECIMAL,
  overtime_hours DECIMAL,
  night_hours DECIMAL,
  shift_counts JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN sa.actual_end_time IS NOT NULL AND sa.actual_start_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (sa.actual_end_time - sa.actual_start_time)) / 3600
        ELSE 8 -- Default shift hours
      END
    ), 0) AS total_hours,
    COALESCE(SUM(
      CASE 
        WHEN sa.shift_type = 'day' THEN 8
        ELSE 0
      END
    ), 0) AS regular_hours,
    GREATEST(0, SUM(
      CASE 
        WHEN sa.actual_end_time IS NOT NULL AND sa.actual_start_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (sa.actual_end_time - sa.actual_start_time)) / 3600
        ELSE 8
      END
    ) - 40) AS overtime_hours,
    COALESCE(SUM(
      CASE 
        WHEN sa.shift_type = 'night' THEN 8
        ELSE 0
      END
    ), 0) AS night_hours,
    jsonb_build_object(
      'day', COUNT(*) FILTER (WHERE sa.shift_type = 'day'),
      'evening', COUNT(*) FILTER (WHERE sa.shift_type = 'evening'),
      'night', COUNT(*) FILTER (WHERE sa.shift_type = 'night'),
      'off', COUNT(*) FILTER (WHERE sa.shift_type = 'off')
    ) AS shift_counts
  FROM schedule_assignments sa
  JOIN schedules s ON sa.schedule_id = s.id
  WHERE sa.employee_id = p_employee_id
    AND s.schedule_date BETWEEN p_start_date AND p_end_date
    AND sa.status = 'confirmed';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update work time aggregations
CREATE OR REPLACE FUNCTION update_work_time_aggregation() RETURNS TRIGGER AS $$
BEGIN
  -- Update daily aggregation
  INSERT INTO work_time_aggregations (
    employee_id,
    tenant_id,
    period_type,
    period_start,
    period_end,
    total_hours,
    total_shifts
  )
  VALUES (
    NEW.employee_id,
    (SELECT tenant_id FROM employees WHERE id = NEW.employee_id),
    'daily',
    (SELECT schedule_date FROM schedules WHERE id = NEW.schedule_id),
    (SELECT schedule_date FROM schedules WHERE id = NEW.schedule_id),
    CASE 
      WHEN NEW.actual_end_time IS NOT NULL AND NEW.actual_start_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 3600
      ELSE 8
    END,
    1
  )
  ON CONFLICT (employee_id, period_type, period_start)
  DO UPDATE SET
    total_hours = work_time_aggregations.total_hours + EXCLUDED.total_hours,
    total_shifts = work_time_aggregations.total_shifts + 1,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_time
  AFTER INSERT OR UPDATE ON schedule_assignments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION update_work_time_aggregation();

-- Function to check and create alerts
CREATE OR REPLACE FUNCTION check_monitoring_thresholds() RETURNS VOID AS $$
DECLARE
  v_threshold RECORD;
  v_metric_value DECIMAL;
  v_alert_message TEXT;
BEGIN
  -- Check each active threshold
  FOR v_threshold IN 
    SELECT * FROM alert_thresholds 
    WHERE is_active = true
  LOOP
    -- Check consecutive night shifts
    IF v_threshold.metric_type = 'consecutive_nights' THEN
      FOR v_employee IN 
        SELECT employee_id, COUNT(*) as nights
        FROM (
          SELECT 
            sa.employee_id,
            s.schedule_date,
            sa.shift_type,
            LAG(s.schedule_date) OVER (PARTITION BY sa.employee_id ORDER BY s.schedule_date) as prev_date
          FROM schedule_assignments sa
          JOIN schedules s ON sa.schedule_id = s.id
          WHERE sa.shift_type = 'night'
            AND s.schedule_date >= CURRENT_DATE - INTERVAL '14 days'
        ) t
        WHERE prev_date IS NULL OR schedule_date = prev_date + INTERVAL '1 day'
        GROUP BY employee_id
        HAVING COUNT(*) >= v_threshold.warning_threshold
      LOOP
        INSERT INTO monitoring_alerts (
          tenant_id,
          alert_type,
          severity,
          metric_type,
          metric_value,
          threshold_value,
          affected_entity_type,
          affected_entity_id,
          title,
          message
        ) VALUES (
          v_threshold.tenant_id,
          'consecutive_nights',
          CASE 
            WHEN v_employee.nights >= v_threshold.critical_threshold THEN 'critical'
            ELSE 'warning'
          END,
          'consecutive_nights',
          v_employee.nights,
          v_threshold.warning_threshold,
          'employee',
          v_employee.employee_id,
          'Consecutive Night Shifts Alert',
          FORMAT('Employee has worked %s consecutive night shifts', v_employee.nights)
        );
      END LOOP;
    END IF;
    
    -- Add more threshold checks here...
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- INDEXES
-- ==============================================

-- Work time aggregations indexes
CREATE INDEX idx_work_time_employee ON work_time_aggregations(employee_id, period_type, period_start);
CREATE INDEX idx_work_time_tenant ON work_time_aggregations(tenant_id, period_start);
CREATE INDEX idx_work_time_date_range ON work_time_aggregations(period_start, period_end);

-- Fatigue metrics indexes
CREATE INDEX idx_fatigue_employee ON fatigue_metrics(employee_id, calculation_date DESC);
CREATE INDEX idx_fatigue_risk ON fatigue_metrics(risk_level, calculation_date DESC);
CREATE INDEX idx_fatigue_high_risk ON fatigue_metrics(risk_level, calculation_date DESC) WHERE risk_level IN ('high', 'critical');

-- Shift statistics indexes
CREATE INDEX idx_shift_stats_tenant ON shift_statistics(tenant_id, stat_date DESC);
CREATE INDEX idx_shift_stats_team ON shift_statistics(team_id, stat_date DESC);

-- Team balance indexes
CREATE INDEX idx_team_balance_team ON team_balance_reports(team_id, report_date DESC);
CREATE INDEX idx_team_balance_score ON team_balance_reports(overall_balance_score, report_date DESC);

-- Performance indicators indexes
CREATE INDEX idx_kpi_tenant ON performance_indicators(tenant_id, indicator_date DESC);
CREATE INDEX idx_kpi_type ON performance_indicators(indicator_type, indicator_date DESC);
CREATE INDEX idx_kpi_status ON performance_indicators(status, indicator_date DESC);

-- Alert thresholds indexes
CREATE INDEX idx_alert_threshold_active ON alert_thresholds(tenant_id, is_active);

-- Monitoring alerts indexes
CREATE INDEX idx_monitoring_alerts_tenant ON monitoring_alerts(tenant_id, created_at DESC);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status, severity, created_at DESC);
CREATE INDEX idx_monitoring_alerts_type ON monitoring_alerts(alert_type, created_at DESC);
CREATE INDEX idx_alerts_active ON monitoring_alerts(tenant_id, status, created_at DESC) WHERE status = 'active';

-- ==============================================
-- RLS POLICIES
-- ==============================================

ALTER TABLE work_time_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatigue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_balance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Employees can see their own data
CREATE POLICY "Employees can view own work time" ON work_time_aggregations
  FOR SELECT USING (auth.uid() IN (
    SELECT auth_user_id FROM employees WHERE id = work_time_aggregations.employee_id
  ));

CREATE POLICY "Employees can view own fatigue metrics" ON fatigue_metrics
  FOR SELECT USING (auth.uid() IN (
    SELECT auth_user_id FROM employees WHERE id = fatigue_metrics.employee_id
  ));

-- Managers can see their team's data
CREATE POLICY "Managers can view team statistics" ON shift_statistics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = shift_statistics.tenant_id 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can view team balance" ON team_balance_reports
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = team_balance_reports.tenant_id 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins can manage everything
CREATE POLICY "Admins can manage alert thresholds" ON alert_thresholds
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = alert_thresholds.tenant_id 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all alerts" ON monitoring_alerts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = monitoring_alerts.tenant_id 
      AND role IN ('admin', 'manager')
    )
  );

-- ==============================================
-- SAMPLE DATA & INITIAL THRESHOLDS
-- ==============================================

-- Insert default alert thresholds
INSERT INTO alert_thresholds (tenant_id, metric_type, threshold_name, warning_threshold, critical_threshold, check_frequency)
SELECT 
  id as tenant_id,
  'consecutive_nights' as metric_type,
  'Consecutive Night Shifts' as threshold_name,
  3 as warning_threshold,
  5 as critical_threshold,
  'daily' as check_frequency
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO alert_thresholds (tenant_id, metric_type, threshold_name, warning_threshold, critical_threshold, check_frequency)
SELECT 
  id as tenant_id,
  'weekly_hours' as metric_type,
  'Weekly Work Hours' as threshold_name,
  48 as warning_threshold,
  52 as critical_threshold,
  'weekly' as check_frequency
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO alert_thresholds (tenant_id, metric_type, threshold_name, warning_threshold, critical_threshold, check_frequency)
SELECT 
  id as tenant_id,
  'fatigue_score' as metric_type,
  'Fatigue Score' as threshold_name,
  6 as warning_threshold,
  8 as critical_threshold,
  'daily' as check_frequency
FROM tenants
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON work_time_aggregations TO authenticated;
GRANT INSERT, UPDATE ON fatigue_metrics TO authenticated;
GRANT INSERT, UPDATE ON monitoring_alerts TO authenticated;