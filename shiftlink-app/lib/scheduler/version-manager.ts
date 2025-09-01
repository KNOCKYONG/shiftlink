// 스케줄 버전 관리 시스템
import { createClient } from '@supabase/supabase-js';
import { ScheduleAssignment } from './engine';

export interface ScheduleVersion {
  id: string;
  scheduleId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  changeType: 'initial' | 'swap' | 'absence' | 'leave' | 'manual_edit' | 'auto_regenerate';
  changeDescription: string;
  snapshot: ScheduleSnapshot;
  affectedEmployees: string[];
  isPublished: boolean;
  publishedAt?: string;
}

export interface ScheduleSnapshot {
  assignments: ScheduleAssignment[];
  metadata: {
    startDate: string;
    endDate: string;
    teamId: string;
    employeeCount: number;
    generatedAt: string;
  };
  metrics: {
    fairnessScore: number;
    complianceScore: number;
    preferenceMatchScore: number;
    hierarchyCoverageScore: number;
  };
}

export interface ScheduleChange {
  employeeId: string;
  date: string;
  oldShift: string;
  newShift: string;
  reason: string;
}

export class VersionManager {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 새 버전 생성
  async createVersion(
    scheduleId: string,
    changeType: ScheduleVersion['changeType'],
    changeDescription: string,
    snapshot: ScheduleSnapshot,
    changes: ScheduleChange[],
    createdBy: string
  ): Promise<ScheduleVersion> {
    // 버전 생성
    const { data: version, error: versionError } = await this.supabase
      .from('schedule_versions')
      .insert({
        schedule_id: scheduleId,
        created_by: createdBy,
        change_type: changeType,
        change_description: changeDescription,
        snapshot: snapshot,
        affected_employees: [...new Set(changes.map(c => c.employeeId))],
        is_published: false
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // 변경 로그 생성
    if (changes.length > 0) {
      const changeLogs = changes.map(change => ({
        version_id: version.id,
        employee_id: change.employeeId,
        date: change.date,
        old_shift: change.oldShift,
        new_shift: change.newShift,
        reason: change.reason
      }));

      const { error: logError } = await this.supabase
        .from('schedule_change_logs')
        .insert(changeLogs);

      if (logError) throw logError;
    }

    return version;
  }

  // 버전 비교
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    added: ScheduleAssignment[];
    removed: ScheduleAssignment[];
    modified: ScheduleChange[];
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    const assignments1 = new Map(
      version1.snapshot.assignments.map(a => [`${a.employeeId}-${a.date}`, a])
    );
    const assignments2 = new Map(
      version2.snapshot.assignments.map(a => [`${a.employeeId}-${a.date}`, a])
    );

    const added: ScheduleAssignment[] = [];
    const removed: ScheduleAssignment[] = [];
    const modified: ScheduleChange[] = [];

    // 추가/수정 찾기
    assignments2.forEach((assignment, key) => {
      const oldAssignment = assignments1.get(key);
      if (!oldAssignment) {
        added.push(assignment);
      } else if (oldAssignment.shiftType !== assignment.shiftType) {
        modified.push({
          employeeId: assignment.employeeId,
          date: assignment.date,
          oldShift: oldAssignment.shiftType,
          newShift: assignment.shiftType,
          reason: 'Version comparison'
        });
      }
    });

    // 삭제 찾기
    assignments1.forEach((assignment, key) => {
      if (!assignments2.has(key)) {
        removed.push(assignment);
      }
    });

    return { added, removed, modified };
  }

  // 버전 가져오기
  async getVersion(versionId: string): Promise<ScheduleVersion> {
    const { data, error } = await this.supabase
      .from('schedule_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data;
  }

  // 최신 버전 가져오기
  async getLatestVersion(scheduleId: string): Promise<ScheduleVersion | null> {
    const { data, error } = await this.supabase
      .from('schedule_versions')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return data;
  }

  // 버전 히스토리 가져오기
  async getVersionHistory(
    scheduleId: string,
    limit = 10
  ): Promise<ScheduleVersion[]> {
    const { data, error } = await this.supabase
      .from('schedule_versions')
      .select(`
        *,
        created_by_employee:employees!created_by(name)
      `)
      .eq('schedule_id', scheduleId)
      .order('version_number', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // 버전 게시
  async publishVersion(versionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('schedule_versions')
      .update({
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq('id', versionId);

    if (error) throw error;
  }

  // 버전 롤백
  async rollbackToVersion(
    scheduleId: string,
    targetVersionId: string,
    reason: string,
    userId: string
  ): Promise<ScheduleVersion> {
    const targetVersion = await this.getVersion(targetVersionId);
    
    return await this.createVersion(
      scheduleId,
      'manual_edit',
      `Rollback to version ${targetVersion.versionNumber}: ${reason}`,
      targetVersion.snapshot,
      [],
      userId
    );
  }

  // 변경사항 적용 (교환, 휴가 등)
  async applyChange(
    scheduleId: string,
    changeType: ScheduleVersion['changeType'],
    changes: ScheduleChange[],
    description: string,
    userId: string
  ): Promise<ScheduleVersion> {
    // 최신 버전 가져오기
    const latestVersion = await this.getLatestVersion(scheduleId);
    if (!latestVersion) {
      throw new Error('No existing version found');
    }

    // 스냅샷 복사 및 변경사항 적용
    const newSnapshot = JSON.parse(JSON.stringify(latestVersion.snapshot)) as ScheduleSnapshot;
    
    // 변경사항을 스냅샷에 적용
    changes.forEach(change => {
      const assignmentIndex = newSnapshot.assignments.findIndex(
        a => a.employeeId === change.employeeId && a.date === change.date
      );

      if (assignmentIndex >= 0) {
        newSnapshot.assignments[assignmentIndex].shiftType = change.newShift;
      } else {
        // 새 배정 추가
        newSnapshot.assignments.push({
          employeeId: change.employeeId,
          date: change.date,
          shiftType: change.newShift
        });
      }
    });

    // 새 버전 생성
    return await this.createVersion(
      scheduleId,
      changeType,
      description,
      newSnapshot,
      changes,
      userId
    );
  }

  // 버전 간 충돌 검사
  async checkConflicts(
    versionId: string,
    proposedChanges: ScheduleChange[]
  ): Promise<{
    hasConflicts: boolean;
    conflicts: string[];
  }> {
    const version = await this.getVersion(versionId);
    const conflicts: string[] = [];

    // 제약조건 검증 로직
    // TODO: 실제 제약조건 검증 구현
    proposedChanges.forEach(change => {
      // 예시: 동일 날짜에 중복 배정 검사
      const existingAssignments = version.snapshot.assignments.filter(
        a => a.date === change.date && a.employeeId === change.employeeId
      );
      
      if (existingAssignments.length > 0 && existingAssignments[0].shiftType !== change.oldShift) {
        conflicts.push(
          `Conflict: Employee ${change.employeeId} on ${change.date} - ` +
          `current shift is ${existingAssignments[0].shiftType}, not ${change.oldShift}`
        );
      }
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  // 버전 병합 (여러 변경사항을 하나로)
  async mergeChanges(
    scheduleId: string,
    changeRequests: Array<{
      type: ScheduleVersion['changeType'];
      changes: ScheduleChange[];
      description: string;
    }>,
    userId: string
  ): Promise<ScheduleVersion> {
    const latestVersion = await this.getLatestVersion(scheduleId);
    if (!latestVersion) {
      throw new Error('No existing version found');
    }

    // 모든 변경사항 수집
    const allChanges: ScheduleChange[] = [];
    const descriptions: string[] = [];

    changeRequests.forEach(request => {
      allChanges.push(...request.changes);
      descriptions.push(request.description);
    });

    // 충돌 검사
    const { hasConflicts, conflicts } = await this.checkConflicts(
      latestVersion.id,
      allChanges
    );

    if (hasConflicts) {
      throw new Error(`Merge conflicts detected: ${conflicts.join(', ')}`);
    }

    // 병합된 변경사항 적용
    return await this.applyChange(
      scheduleId,
      'manual_edit',
      allChanges,
      `Merged changes: ${descriptions.join('; ')}`,
      userId
    );
  }
}