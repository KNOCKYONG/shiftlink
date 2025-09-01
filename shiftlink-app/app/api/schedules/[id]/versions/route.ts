// POST /api/schedules/[id]/versions
// 스케줄 버전 생성 (변경사항 적용)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VersionManager } from '@/lib/scheduler/version-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const scheduleId = params.id;

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const {
      changeType,
      changes,
      description
    } = body;

    // 유효성 검사
    if (!changeType || !changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: 'Missing required fields: changeType, changes' },
        { status: 400 }
      );
    }

    // 스케줄 존재 확인
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // 버전 매니저 초기화
    const versionManager = new VersionManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 변경사항 적용 및 새 버전 생성
    const newVersion = await versionManager.applyChange(
      scheduleId,
      changeType,
      changes,
      description || `${changeType} changes applied`,
      user.id
    );

    // 스케줄 배정 업데이트
    // 먼저 기존 배정 삭제
    await supabase
      .from('schedule_assignments')
      .delete()
      .eq('schedule_id', scheduleId);

    // 새 배정 삽입
    const assignments = newVersion.snapshot.assignments.map(assignment => ({
      schedule_id: scheduleId,
      employee_id: assignment.employeeId,
      date: assignment.date,
      shift_type: assignment.shiftType,
      is_fixed: assignment.isFixed || false
    }));

    await supabase
      .from('schedule_assignments')
      .insert(assignments);

    // 메트릭 재계산 (필요시)
    if (newVersion.snapshot.metrics) {
      await supabase
        .from('schedule_metrics')
        .insert({
          schedule_id: scheduleId,
          version_id: newVersion.id,
          fairness_score: newVersion.snapshot.metrics.fairnessScore,
          compliance_score: newVersion.snapshot.metrics.complianceScore,
          preference_match_score: newVersion.snapshot.metrics.preferenceMatchScore,
          hierarchy_coverage_score: newVersion.snapshot.metrics.hierarchyCoverageScore,
          calculated_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      versionId: newVersion.id,
      versionNumber: newVersion.versionNumber,
      affectedEmployees: newVersion.affectedEmployees
    });

  } catch (error) {
    console.error('Version creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create version', details: error },
      { status: 500 }
    );
  }
}

// GET /api/schedules/[id]/versions
// 스케줄 버전 히스토리 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const scheduleId = params.id;

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 버전 매니저 초기화
    const versionManager = new VersionManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 버전 히스토리 가져오기
    const versions = await versionManager.getVersionHistory(scheduleId, 20);

    return NextResponse.json({
      success: true,
      versions: versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changeType: v.changeType,
        changeDescription: v.changeDescription,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
        isPublished: v.isPublished,
        publishedAt: v.publishedAt,
        affectedEmployees: v.affectedEmployees
      }))
    });

  } catch (error) {
    console.error('Version history error:', error);
    return NextResponse.json(
      { error: 'Failed to get version history', details: error },
      { status: 500 }
    );
  }
}