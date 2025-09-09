#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 설정
const supabaseUrl = 'https://igofcukuimzljtjaxfda.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnb2ZjdWt1aW16bGp0amF4ZmRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY4NTc3MywiZXhwIjoyMDcyMjYxNzczfQ.8-W4gYyxFzOk1Dy3H3YwzFXKjrqsI1Q3xYvCwqTJaXY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupDatabase() {
    try {
        console.log('🚀 ShiftLink 데이터베이스 설정 시작...');

        // 1. 기본 테이블 생성
        console.log('📋 기본 테이블 생성 중...');
        
        // Tenants 테이블
        const { error: tenantsError } = await supabase.rpc('create_tenant_table');
        if (tenantsError && !tenantsError.message.includes('already exists')) {
            // 직접 SQL로 테이블 생성
            await supabase.from('_sql').insert({
                query: `
                CREATE TABLE IF NOT EXISTS tenants (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    industry_type VARCHAR(100) DEFAULT 'healthcare',
                    settings JSONB DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT now(),
                    updated_at TIMESTAMPTZ DEFAULT now()
                );`
            });
        }

        // 데이터베이스 직접 연결 방식으로 전환
        console.log('💾 직접 SQL 실행으로 전환...');
        
        // 테넌트 생성
        const { data: tenant, error: tenantInsertError } = await supabase
            .from('tenants')
            .upsert({
                name: '서울대학교병원',
                industry_type: 'healthcare',
                settings: { timezone: 'Asia/Seoul', language: 'ko' }
            })
            .select()
            .single();

        if (tenantInsertError) {
            console.log('⚠️ 테넌트 테이블이 없습니다. 수동 설정이 필요합니다.');
            console.log('📋 다음 단계를 따라 수동으로 설정하세요:');
            console.log('1. Supabase Dashboard SQL Editor 열기: https://supabase.com/dashboard/project/igofcukuimzljtjaxfda/sql/new');
            console.log('2. complete_database_setup.sql 파일 내용 실행');
            console.log('3. 관리자 사용자 생성: admin@shiftlink.com / admin123!@#');
            return;
        }

        console.log('✅ 테넌트 생성 완료:', tenant.name);

        // 기본 데이터 확인
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('count', { count: 'exact', head: true });

        if (employeesError) {
            console.log('⚠️ 직원 테이블 접근 불가. 수동 설정이 필요합니다.');
        } else {
            console.log(`👥 현재 직원 수: ${employees.count || 0}명`);
        }

        // 스케줄 확인
        const { data: schedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('count', { count: 'exact', head: true });

        if (schedulesError) {
            console.log('⚠️ 스케줄 테이블 접근 불가. 수동 설정이 필요합니다.');
        } else {
            console.log(`📅 현재 스케줄 수: ${schedules.count || 0}개`);
        }

        console.log('\n🎉 설정 확인 완료!');
        console.log('==========================================');
        console.log('📖 수동 설정 가이드: supabase/MANUAL_SETUP_INSTRUCTIONS.md');
        console.log('🌐 Supabase URL: https://igofcukuimzljtjaxfda.supabase.co');
        console.log('🔑 관리자 계정: admin@shiftlink.com / admin123!@#');

    } catch (error) {
        console.error('❌ 설정 중 오류 발생:', error.message);
        console.log('\n📋 수동 설정 방법:');
        console.log('1. Supabase Dashboard에서 SQL Editor 사용');
        console.log('2. complete_database_setup.sql 실행');
        console.log('3. Authentication에서 관리자 사용자 생성');
    }
}

// 스크립트 실행
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };