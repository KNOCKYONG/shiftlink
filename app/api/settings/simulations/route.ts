import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/settings/simulations - Get all simulations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    // Check permission (admin or manager)
    if (!['admin', 'manager'].includes(employee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Build query
    let query = supabase
      .from('simulation_configs')
      .select(`
        *,
        executed_by:employees!simulation_configs_executed_by_fkey(
          id,
          name,
          email
        ),
        applied_by:employees!simulation_configs_applied_by_fkey(
          id,
          name,
          email
        )
      `)
      .eq('tenant_id', employee.tenant_id)
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: simulations, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      data: simulations
    })
    
  } catch (error) {
    console.error('Error fetching simulations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch simulations' },
      { status: 500 }
    )
  }
}

// POST /api/settings/simulations - Create new simulation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee and check role
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee || !['admin', 'manager'].includes(employee.role)) {
      return NextResponse.json({ error: 'Admin or manager access required' }, { status: 403 })
    }
    
    // Create simulation
    const { data: simulation, error } = await supabase
      .from('simulation_configs')
      .insert({
        tenant_id: employee.tenant_id,
        simulation_name: body.simulation_name,
        description: body.description,
        start_date: body.start_date,
        end_date: body.end_date,
        test_settings: body.test_settings || {},
        test_constraints: body.test_constraints || null,
        test_rules: body.test_rules || null,
        status: 'draft'
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: employee.tenant_id,
      user_id: user.id,
      action: 'create_simulation',
      entity_type: 'simulation_configs',
      entity_id: simulation.id,
      details: {
        simulation_name: body.simulation_name,
        period: {
          start: body.start_date,
          end: body.end_date
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: simulation
    })
    
  } catch (error) {
    console.error('Error creating simulation:', error)
    return NextResponse.json(
      { error: 'Failed to create simulation' },
      { status: 500 }
    )
  }
}

// POST /api/settings/simulations/[id]/run - Run simulation
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const simulationId = body.id
    const action = body.action
    
    if (!simulationId || !action) {
      return NextResponse.json({ error: 'Simulation ID and action required' }, { status: 400 })
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee || !['admin', 'manager'].includes(employee.role)) {
      return NextResponse.json({ error: 'Admin or manager access required' }, { status: 403 })
    }
    
    if (action === 'run') {
      // Run simulation
      const { data: simulation, error: fetchError } = await supabase
        .from('simulation_configs')
        .select('*')
        .eq('id', simulationId)
        .eq('tenant_id', employee.tenant_id)
        .single()
      
      if (fetchError || !simulation) {
        return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
      }
      
      // Update status to running
      await supabase
        .from('simulation_configs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          executed_by: employee.id
        })
        .eq('id', simulationId)
      
      // Simulate the simulation process (in production, this would be async)
      const simulationResults = await runSimulation(simulation)
      
      // Update with results
      const { data: updatedSimulation, error: updateError } = await supabase
        .from('simulation_configs')
        .update({
          status: 'completed',
          simulation_results: simulationResults,
          completed_at: new Date().toISOString()
        })
        .eq('id', simulationId)
        .select()
        .single()
      
      if (updateError) {
        throw updateError
      }
      
      return NextResponse.json({
        success: true,
        data: updatedSimulation
      })
      
    } else if (action === 'apply') {
      // Apply simulation settings
      const { data: simulation, error: fetchError } = await supabase
        .from('simulation_configs')
        .select('*')
        .eq('id', simulationId)
        .eq('tenant_id', employee.tenant_id)
        .eq('status', 'completed')
        .single()
      
      if (fetchError || !simulation) {
        return NextResponse.json({ error: 'Completed simulation not found' }, { status: 404 })
      }
      
      // Apply test settings to actual settings
      if (simulation.test_settings) {
        await supabase
          .from('tenant_settings')
          .update({
            ...simulation.test_settings,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', employee.tenant_id)
      }
      
      // Mark simulation as applied
      await supabase
        .from('simulation_configs')
        .update({
          is_applied: true,
          applied_at: new Date().toISOString(),
          applied_by: employee.id
        })
        .eq('id', simulationId)
      
      // Log the application
      await supabase.from('audit_logs').insert({
        tenant_id: employee.tenant_id,
        user_id: user.id,
        action: 'apply_simulation',
        entity_type: 'simulation_configs',
        entity_id: simulationId,
        details: {
          simulation_name: simulation.simulation_name,
          settings_applied: !!simulation.test_settings,
          constraints_applied: !!simulation.test_constraints,
          rules_applied: !!simulation.test_rules
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Simulation settings applied successfully'
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error running simulation:', error)
    return NextResponse.json(
      { error: 'Failed to run simulation' },
      { status: 500 }
    )
  }
}

// Helper function to simulate schedule generation
async function runSimulation(simulation: any): Promise<any> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Generate mock results
  const results = {
    success_rate: 85 + Math.random() * 10,
    violations: [],
    warnings: [],
    metrics: {
      coverage: 90 + Math.random() * 10,
      fairness: 85 + Math.random() * 10,
      cost: 95 + Math.random() * 10,
      compliance: 95 + Math.random() * 5
    },
    recommendations: []
  }
  
  // Add some conditional warnings
  if (simulation.test_settings?.maximum_weekly_hours > 48) {
    results.warnings.push('주당 근무시간이 48시간을 초과하여 초과근무 비용이 증가할 수 있습니다')
  }
  
  if (simulation.test_settings?.max_consecutive_nights > 5) {
    results.warnings.push('연속 야간 근무가 5일을 초과하여 피로도가 증가할 수 있습니다')
  }
  
  // Add recommendations
  if (results.metrics.fairness < 90) {
    results.recommendations.push('근무 패턴을 더 균등하게 분배하는 것을 고려하세요')
  }
  
  if (results.metrics.cost > 100) {
    results.recommendations.push('초과근무를 줄이기 위해 추가 인력 채용을 고려하세요')
  }
  
  return results
}

// DELETE /api/settings/simulations/[id] - Delete simulation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const simulationId = searchParams.get('id')
    
    if (!simulationId) {
      return NextResponse.json({ error: 'Simulation ID required' }, { status: 400 })
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee and check admin role
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee || employee.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Delete simulation
    const { error } = await supabase
      .from('simulation_configs')
      .delete()
      .eq('id', simulationId)
      .eq('tenant_id', employee.tenant_id)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simulation deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting simulation:', error)
    return NextResponse.json(
      { error: 'Failed to delete simulation' },
      { status: 500 }
    )
  }
}