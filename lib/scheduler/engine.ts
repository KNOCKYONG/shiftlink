// 스케줄 생성 엔진
import { format, addDays, differenceInDays, startOfWeek, getDay } from 'date-fns';

export interface Employee {
  id: string;
  name: string;
  hierarchyLevel: number;
  preferencePattern?: string[];
  defaultRequests?: DefaultRequest[];
}

export interface DefaultRequest {
  type: 'fixed_shift' | 'leave' | 'constraint';
  dayOfWeek?: number;
  specificDate?: string;
  dateFrom?: string;
  dateTo?: string;
  shiftType?: 'day' | 'evening' | 'night' | 'off';
  priority: number;
}

export interface HierarchyRule {
  level: number;
  roleName: string;
  minRequired: number;
  priorityOnConflict: 'higher' | 'lower' | 'balanced';
}

export interface ScheduleParameters {
  startDate: string;
  endDate: string;
  employees: Employee[];
  hierarchyRules: HierarchyRule[];
  shiftTypes: string[];
  constraints: {
    minRestHours: number;
    maxWeeklyHours: number;
    maxConsecutiveNights: number;
    requireHierarchyCoverage: boolean;
  };
}

export interface ScheduleAssignment {
  employeeId: string;
  date: string;
  shiftType: string;
  isFixed?: boolean;
  violatesConstraint?: boolean;
  warnings?: string[];
}

export interface ScheduleResult {
  assignments: ScheduleAssignment[];
  metrics: {
    fairnessScore: number;
    complianceScore: number;
    preferenceMatchScore: number;
    hierarchyCoverageScore: number;
    totalConflicts: number;
    totalWarnings: number;
  };
  conflicts: string[];
  warnings: string[];
}

export class ScheduleEngine {
  private parameters: ScheduleParameters;
  private assignments: Map<string, ScheduleAssignment> = new Map();
  private employeeShiftCounts: Map<string, Map<string, number>> = new Map();
  private employeeWorkHistory: Map<string, ScheduleAssignment[]> = new Map();

  constructor(parameters: ScheduleParameters) {
    this.parameters = parameters;
    this.initializeEmployeeData();
  }

  private initializeEmployeeData() {
    this.parameters.employees.forEach(emp => {
      this.employeeShiftCounts.set(emp.id, new Map());
      this.employeeWorkHistory.set(emp.id, []);
    });
  }

  // 메인 스케줄 생성 함수
  public generateSchedule(): ScheduleResult {
    const totalDays = differenceInDays(
      new Date(this.parameters.endDate),
      new Date(this.parameters.startDate)
    ) + 1;

    // 1단계: 고정 요청사항 먼저 배치
    this.applyFixedRequests();

    // 2단계: 날짜별로 스케줄 생성
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const currentDate = format(
        addDays(new Date(this.parameters.startDate), dayOffset),
        'yyyy-MM-dd'
      );
      
      this.scheduleDay(currentDate);
    }

    // 3단계: 공정성 조정
    this.balanceSchedule();

    // 4단계: 검증 및 메트릭 계산
    const metrics = this.calculateMetrics();
    const { conflicts, warnings } = this.validateSchedule();

    return {
      assignments: Array.from(this.assignments.values()),
      metrics,
      conflicts,
      warnings
    };
  }

  // 고정 요청사항 적용
  private applyFixedRequests() {
    this.parameters.employees.forEach(employee => {
      if (!employee.defaultRequests) return;

      employee.defaultRequests
        .filter(req => req.type === 'fixed_shift' || req.type === 'leave')
        .sort((a, b) => b.priority - a.priority)
        .forEach(request => {
          this.applyRequest(employee, request);
        });
    });
  }

  private applyRequest(employee: Employee, request: DefaultRequest) {
    const totalDays = differenceInDays(
      new Date(this.parameters.endDate),
      new Date(this.parameters.startDate)
    ) + 1;

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const currentDate = addDays(new Date(this.parameters.startDate), dayOffset);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      let shouldApply = false;

      if (request.type === 'fixed_shift' && request.dayOfWeek !== undefined) {
        shouldApply = getDay(currentDate) === request.dayOfWeek;
      } else if (request.type === 'leave' && request.specificDate) {
        shouldApply = dateStr === request.specificDate;
      }

      if (shouldApply && request.shiftType) {
        const key = `${employee.id}-${dateStr}`;
        this.assignments.set(key, {
          employeeId: employee.id,
          date: dateStr,
          shiftType: request.shiftType,
          isFixed: true
        });
      }
    }
  }

  // 하루 스케줄 생성
  private scheduleDay(date: string) {
    const shifts = ['day', 'evening', 'night'];
    
    shifts.forEach(shift => {
      // 계층별 최소 인원 확보
      if (this.parameters.constraints.requireHierarchyCoverage) {
        this.ensureHierarchyCoverage(date, shift);
      }

      // 나머지 인원 배치
      this.fillRemainingSlots(date, shift);
    });

    // Off 배정
    this.assignOffDays(date);
  }

  // 계층별 최소 인원 확보
  private ensureHierarchyCoverage(date: string, shift: string) {
    this.parameters.hierarchyRules.forEach(rule => {
      const levelEmployees = this.parameters.employees.filter(
        emp => emp.hierarchyLevel === rule.level
      );

      const assigned = levelEmployees.filter(emp => {
        const key = `${emp.id}-${date}`;
        const assignment = this.assignments.get(key);
        return assignment && assignment.shiftType === shift;
      });

      const needed = rule.minRequired - assigned.length;
      if (needed > 0) {
        const available = levelEmployees.filter(emp => 
          this.isEmployeeAvailable(emp, date, shift)
        );

        // 선호도와 공정성을 고려한 선택
        const selected = this.selectBestEmployees(available, shift, needed);
        selected.forEach(emp => {
          this.assignShift(emp, date, shift);
        });
      }
    });
  }

  // 직원 가용성 체크
  private isEmployeeAvailable(employee: Employee, date: string, shift: string): boolean {
    const key = `${employee.id}-${date}`;
    
    // 이미 배정된 경우
    if (this.assignments.has(key)) {
      return false;
    }

    // 휴식시간 체크
    if (!this.checkRestTime(employee.id, date, shift)) {
      return false;
    }

    // 주간 근무시간 체크
    if (!this.checkWeeklyHours(employee.id, date)) {
      return false;
    }

    // 연속 야간 근무 체크
    if (shift === 'night' && !this.checkConsecutiveNights(employee.id, date)) {
      return false;
    }

    return true;
  }

  // 휴식시간 체크 (11시간)
  private checkRestTime(employeeId: string, date: string, shift: string): boolean {
    const prevDate = format(addDays(new Date(date), -1), 'yyyy-MM-dd');
    const prevKey = `${employeeId}-${prevDate}`;
    const prevAssignment = this.assignments.get(prevKey);

    if (!prevAssignment) return true;

    const shiftEndTimes: Record<string, number> = {
      'day': 15,
      'evening': 23,
      'night': 7
    };

    const shiftStartTimes: Record<string, number> = {
      'day': 7,
      'evening': 15,
      'night': 23
    };

    const prevEnd = shiftEndTimes[prevAssignment.shiftType];
    const currentStart = shiftStartTimes[shift];

    let restHours = 0;
    if (prevAssignment.shiftType === 'night' && shift === 'day') {
      restHours = 24 - prevEnd + currentStart;
    } else if (prevEnd > currentStart) {
      restHours = 24 - prevEnd + currentStart;
    } else {
      restHours = currentStart - prevEnd;
    }

    return restHours >= this.parameters.constraints.minRestHours;
  }

  // 주간 근무시간 체크
  private checkWeeklyHours(employeeId: string, date: string): boolean {
    const weekStart = startOfWeek(new Date(date));
    let totalHours = 0;

    for (let i = 0; i < 7; i++) {
      const checkDate = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const key = `${employeeId}-${checkDate}`;
      const assignment = this.assignments.get(key);
      
      if (assignment && assignment.shiftType !== 'off') {
        totalHours += 8; // 각 시프트 8시간 가정
      }
    }

    return totalHours < this.parameters.constraints.maxWeeklyHours;
  }

  // 연속 야간 근무 체크
  private checkConsecutiveNights(employeeId: string, date: string): boolean {
    let consecutiveNights = 0;
    
    for (let i = 1; i <= this.parameters.constraints.maxConsecutiveNights; i++) {
      const checkDate = format(addDays(new Date(date), -i), 'yyyy-MM-dd');
      const key = `${employeeId}-${checkDate}`;
      const assignment = this.assignments.get(key);
      
      if (assignment && assignment.shiftType === 'night') {
        consecutiveNights++;
      } else {
        break;
      }
    }

    return consecutiveNights < this.parameters.constraints.maxConsecutiveNights;
  }

  // 최적 직원 선택
  private selectBestEmployees(
    available: Employee[],
    shift: string,
    count: number
  ): Employee[] {
    return available
      .map(emp => ({
        employee: emp,
        score: this.calculateEmployeeScore(emp, shift)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.employee);
  }

  // 직원 점수 계산 (선호도, 공정성 고려)
  private calculateEmployeeScore(employee: Employee, shift: string): number {
    let score = 50; // 기본 점수

    // 선호 패턴 매칭
    if (employee.preferencePattern) {
      const patternIndex = this.getPatternIndex(employee.id);
      const preferredShift = employee.preferencePattern[patternIndex % employee.preferencePattern.length];
      if (preferredShift === shift) {
        score += 30;
      }
    }

    // 공정성 (근무 횟수가 적은 직원 우선)
    const shiftCount = this.employeeShiftCounts.get(employee.id)?.get(shift) || 0;
    const avgShiftCount = this.getAverageShiftCount(shift);
    if (shiftCount < avgShiftCount) {
      score += 20 * (1 - shiftCount / Math.max(avgShiftCount, 1));
    }

    return score;
  }

  // 패턴 인덱스 계산
  private getPatternIndex(employeeId: string): number {
    const history = this.employeeWorkHistory.get(employeeId) || [];
    return history.length;
  }

  // 평균 시프트 횟수 계산
  private getAverageShiftCount(shift: string): number {
    let total = 0;
    let count = 0;
    
    this.employeeShiftCounts.forEach(shifts => {
      total += shifts.get(shift) || 0;
      count++;
    });

    return count > 0 ? total / count : 0;
  }

  // 시프트 배정
  private assignShift(employee: Employee, date: string, shift: string) {
    const key = `${employee.id}-${date}`;
    this.assignments.set(key, {
      employeeId: employee.id,
      date,
      shiftType: shift
    });

    // 카운트 업데이트
    const counts = this.employeeShiftCounts.get(employee.id)!;
    counts.set(shift, (counts.get(shift) || 0) + 1);

    // 히스토리 업데이트
    const history = this.employeeWorkHistory.get(employee.id)!;
    history.push({ employeeId: employee.id, date, shiftType: shift });
  }

  // 나머지 슬롯 채우기
  private fillRemainingSlots(date: string, shift: string) {
    const targetCount = Math.ceil(this.parameters.employees.length / 4); // 4교대 기준
    const currentCount = Array.from(this.assignments.values()).filter(
      a => a.date === date && a.shiftType === shift
    ).length;

    const needed = targetCount - currentCount;
    if (needed <= 0) return;

    const available = this.parameters.employees.filter(emp =>
      this.isEmployeeAvailable(emp, date, shift)
    );

    const selected = this.selectBestEmployees(available, shift, needed);
    selected.forEach(emp => {
      this.assignShift(emp, date, shift);
    });
  }

  // Off day 배정
  private assignOffDays(date: string) {
    this.parameters.employees.forEach(employee => {
      const key = `${employee.id}-${date}`;
      if (!this.assignments.has(key)) {
        this.assignShift(employee, date, 'off');
      }
    });
  }

  // 공정성 조정
  private balanceSchedule() {
    // 각 직원의 시프트 횟수를 균등하게 조정
    const targetCounts = this.calculateTargetCounts();
    
    // 조정이 필요한 직원 찾기
    this.parameters.employees.forEach(employee => {
      const counts = this.employeeShiftCounts.get(employee.id)!;
      this.parameters.shiftTypes.forEach(shift => {
        const current = counts.get(shift) || 0;
        const target = targetCounts.get(shift) || 0;
        
        if (Math.abs(current - target) > 2) {
          // 재조정 로직 (구현 필요)
        }
      });
    });
  }

  // 목표 카운트 계산
  private calculateTargetCounts(): Map<string, number> {
    const totalDays = differenceInDays(
      new Date(this.parameters.endDate),
      new Date(this.parameters.startDate)
    ) + 1;
    
    const counts = new Map<string, number>();
    const avgDaysPerShift = totalDays / 4; // 4교대 기준
    
    ['day', 'evening', 'night', 'off'].forEach(shift => {
      counts.set(shift, Math.round(avgDaysPerShift));
    });
    
    return counts;
  }

  // 메트릭 계산
  private calculateMetrics() {
    const fairnessScore = this.calculateFairnessScore();
    const complianceScore = this.calculateComplianceScore();
    const preferenceMatchScore = this.calculatePreferenceScore();
    const hierarchyCoverageScore = this.calculateHierarchyScore();

    const { conflicts, warnings } = this.validateSchedule();

    return {
      fairnessScore,
      complianceScore,
      preferenceMatchScore,
      hierarchyCoverageScore,
      totalConflicts: conflicts.length,
      totalWarnings: warnings.length
    };
  }

  // 공정성 점수 계산
  private calculateFairnessScore(): number {
    let totalDeviation = 0;
    const targetCounts = this.calculateTargetCounts();

    this.employeeShiftCounts.forEach(counts => {
      this.parameters.shiftTypes.forEach(shift => {
        const actual = counts.get(shift) || 0;
        const target = targetCounts.get(shift) || 0;
        totalDeviation += Math.abs(actual - target);
      });
    });

    const maxDeviation = this.parameters.employees.length * this.parameters.shiftTypes.length * 10;
    return Math.max(0, 100 - (totalDeviation / maxDeviation * 100));
  }

  // 법규 준수 점수 계산
  private calculateComplianceScore(): number {
    let violations = 0;
    let totalChecks = 0;

    Array.from(this.assignments.values()).forEach(assignment => {
      totalChecks++;
      if (assignment.violatesConstraint) {
        violations++;
      }
    });

    return totalChecks > 0 ? (1 - violations / totalChecks) * 100 : 100;
  }

  // 선호도 반영 점수 계산
  private calculatePreferenceScore(): number {
    let matches = 0;
    let total = 0;

    this.parameters.employees.forEach(employee => {
      if (!employee.preferencePattern) return;

      const history = this.employeeWorkHistory.get(employee.id) || [];
      history.forEach((assignment, index) => {
        total++;
        const preferredShift = employee.preferencePattern![index % employee.preferencePattern!.length];
        if (assignment.shiftType === preferredShift) {
          matches++;
        }
      });
    });

    return total > 0 ? (matches / total) * 100 : 100;
  }

  // 계층 충족 점수 계산
  private calculateHierarchyScore(): number {
    if (!this.parameters.constraints.requireHierarchyCoverage) {
      return 100;
    }

    let fulfilled = 0;
    let totalRequirements = 0;

    const dates = this.getUniqueDates();
    const shifts = ['day', 'evening', 'night'];

    dates.forEach(date => {
      shifts.forEach(shift => {
        this.parameters.hierarchyRules.forEach(rule => {
          totalRequirements++;
          
          const levelEmployees = this.parameters.employees.filter(
            emp => emp.hierarchyLevel === rule.level
          );

          const assigned = levelEmployees.filter(emp => {
            const key = `${emp.id}-${date}`;
            const assignment = this.assignments.get(key);
            return assignment && assignment.shiftType === shift;
          }).length;

          if (assigned >= rule.minRequired) {
            fulfilled++;
          }
        });
      });
    });

    return totalRequirements > 0 ? (fulfilled / totalRequirements) * 100 : 100;
  }

  // 유니크 날짜 목록
  private getUniqueDates(): string[] {
    const dates = new Set<string>();
    this.assignments.forEach(assignment => {
      dates.add(assignment.date);
    });
    return Array.from(dates).sort();
  }

  // 스케줄 검증
  private validateSchedule(): { conflicts: string[], warnings: string[] } {
    const conflicts: string[] = [];
    const warnings: string[] = [];

    // 휴식시간 검증
    this.parameters.employees.forEach(employee => {
      const history = this.employeeWorkHistory.get(employee.id) || [];
      history.forEach((assignment, index) => {
        if (index > 0) {
          const prev = history[index - 1];
          if (!this.checkRestTime(employee.id, assignment.date, assignment.shiftType)) {
            conflicts.push(
              `${employee.name}: 최소 휴식시간 위반 (${prev.date} → ${assignment.date})`
            );
          }
        }
      });
    });

    // 주간 근무시간 검증
    this.parameters.employees.forEach(employee => {
      const weeks = this.groupByWeek(this.employeeWorkHistory.get(employee.id) || []);
      weeks.forEach((weekAssignments, weekStart) => {
        const hours = weekAssignments.filter(a => a.shiftType !== 'off').length * 8;
        if (hours > this.parameters.constraints.maxWeeklyHours) {
          warnings.push(
            `${employee.name}: 주간 근무시간 초과 (${weekStart} 주, ${hours}시간)`
          );
        }
      });
    });

    // 연속 야간 근무 검증
    this.parameters.employees.forEach(employee => {
      const history = this.employeeWorkHistory.get(employee.id) || [];
      let consecutiveNights = 0;
      
      history.forEach(assignment => {
        if (assignment.shiftType === 'night') {
          consecutiveNights++;
          if (consecutiveNights > this.parameters.constraints.maxConsecutiveNights) {
            warnings.push(
              `${employee.name}: 연속 야간 근무 초과 (${assignment.date})`
            );
          }
        } else {
          consecutiveNights = 0;
        }
      });
    });

    return { conflicts, warnings };
  }

  // 주별 그룹화
  private groupByWeek(assignments: ScheduleAssignment[]): Map<string, ScheduleAssignment[]> {
    const weeks = new Map<string, ScheduleAssignment[]>();
    
    assignments.forEach(assignment => {
      const weekStart = format(startOfWeek(new Date(assignment.date)), 'yyyy-MM-dd');
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, []);
      }
      weeks.get(weekStart)!.push(assignment);
    });

    return weeks;
  }
}