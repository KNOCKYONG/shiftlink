import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  error?: string
  details?: Record<string, any>
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const checks: HealthCheck[] = []
  
  try {
    // Database connectivity check
    const dbCheck = await checkDatabase()
    checks.push(dbCheck)
    
    // External API checks
    const externalChecks = await Promise.allSettled([
      checkSupabaseAuth(),
      checkSupabaseStorage(),
    ])
    
    externalChecks.forEach((result, index) => {
      const checkNames = ['supabase-auth', 'supabase-storage']
      if (result.status === 'fulfilled') {
        checks.push(result.value)
      } else {
        checks.push({
          name: checkNames[index],
          status: 'unhealthy',
          error: result.reason?.message || 'Unknown error'
        })
      }
    })
    
    // System health checks
    const systemCheck = await checkSystemHealth()
    checks.push(systemCheck)
    
    // Determine overall status
    const overallStatus = determineOverallStatus(checks)
    const totalTime = Date.now() - startTime
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      responseTime: totalTime,
      checks
    }
    
    // Return appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - startTime,
      checks
    }, { status: 503 })
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Test database connection with a simple query
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        error: error.message
      }
    }
    
    return {
      name: 'database',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        connectionPool: 'active',
        queryResponse: 'ok'
      }
    }
    
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

async function checkSupabaseAuth(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Test auth service by getting current session
    const { data, error } = await supabase.auth.getSession()
    
    const responseTime = Date.now() - startTime
    
    if (error && error.message !== 'Auth session missing!') {
      return {
        name: 'supabase-auth',
        status: 'unhealthy',
        responseTime,
        error: error.message
      }
    }
    
    return {
      name: 'supabase-auth',
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        service: 'active'
      }
    }
    
  } catch (error) {
    return {
      name: 'supabase-auth',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Auth service check failed'
    }
  }
}

async function checkSupabaseStorage(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Test storage service by listing buckets
    const { data, error } = await supabase.storage.listBuckets()
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        name: 'supabase-storage',
        status: 'unhealthy',
        responseTime,
        error: error.message
      }
    }
    
    return {
      name: 'supabase-storage',
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        bucketsAccessible: Array.isArray(data)
      }
    }
    
  } catch (error) {
    return {
      name: 'supabase-storage',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Storage service check failed'
    }
  }
}

async function checkSystemHealth(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    // Memory usage check
    const memUsage = process.memoryUsage()
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    
    // Determine memory status
    const memoryStatus = memUsedMB > 512 ? 'degraded' : 'healthy'
    
    // CPU load approximation (simplified)
    const loadAverage = process.cpuUsage()
    
    return {
      name: 'system',
      status: memoryStatus,
      responseTime: Date.now() - startTime,
      details: {
        memory: {
          used: `${memUsedMB}MB`,
          total: `${memTotalMB}MB`,
          percentage: Math.round((memUsedMB / memTotalMB) * 100)
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      }
    }
    
  } catch (error) {
    return {
      name: 'system',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'System health check failed'
    }
  }
}

function determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length
  const degradedCount = checks.filter(check => check.status === 'degraded').length
  
  if (unhealthyCount > 0) {
    return 'unhealthy'
  } else if (degradedCount > 0) {
    return 'degraded'
  } else {
    return 'healthy'
  }
}

// Readiness check - simpler check for load balancers
export async function HEAD() {
  try {
    // Quick database connectivity check
    const supabase = await createClient()
    const { error } = await supabase.from('tenants').select('id').limit(1)
    
    if (error) {
      return new Response(null, { status: 503 })
    }
    
    return new Response(null, { status: 200 })
    
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}