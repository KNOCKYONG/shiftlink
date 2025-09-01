import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManagerOrAdmin } from '@/lib/auth/utils'

export interface ConstraintSetting {
  id?: string
  constraint_type: string
  constraint_name: string
  is_enabled: boolean
  is_hard_constraint: boolean
  priority: number
  min_value?: number
  max_value?: number
  default_value?: number
  current_value?: number
  config?: Record<string, any>
  description?: string
  warning_message?: string
}

// GET /api/settings/constraints - Get all constraints
export async function GET(request: NextRequest) {
  try {
    const user = await requireManagerOrAdmin()
    const supabase = createClient()
    
    const { searchParams } = new URL(request.url)
    const isEnabled = searchParams.get('enabled')
    const constraintType = searchParams.get('type')
    
    // First, try to get from rulesets table (legacy)
    let query = supabase
      .from('rulesets')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .eq('is_active', true)
    
    if (constraintType) {
      query = query.eq('rule_type', constraintType)
    }
    
    const { data: constraints, error } = await query.order('rule_name')
    
    if (error) {
      console.error('Error fetching constraints:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch constraints' 
      }, { status: 500 })
    }
    
    // Transform to match constraint setting format
    const transformedConstraints = constraints?.map(rule => ({
      id: rule.id,
      constraint_type: rule.rule_type || 'working_hours',
      constraint_name: rule.rule_name,
      is_enabled: rule.is_active,
      is_hard_constraint: true,
      priority: 50,
      current_value: rule.rule_value,
      description: rule.description,
      config: rule.config || {}
    })) || []
    
    return NextResponse.json({
      success: true,
      constraints: transformedConstraints
    })
    
  } catch (error) {
    console.error('Error fetching constraints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch constraints' },
      { status: 500 }
    )
  }
}

// POST /api/settings/constraints - Create new constraint
export async function POST(request: NextRequest) {
  try {
    const user = await requireManagerOrAdmin()
    const supabase = createClient()
    
    const body = await request.json()
    const constraint: ConstraintSetting = body
    
    if (!constraint.constraint_name || !constraint.constraint_type) {
      return NextResponse.json({ 
        error: 'Constraint name and type are required' 
      }, { status: 400 })
    }
    
    // Validate constraint values
    if (constraint.current_value !== undefined) {
      if (constraint.min_value !== undefined && constraint.current_value < constraint.min_value) {
        return NextResponse.json({ 
          error: `Value must be at least ${constraint.min_value}` 
        }, { status: 400 })
      }
      
      if (constraint.max_value !== undefined && constraint.current_value > constraint.max_value) {
        return NextResponse.json({ 
          error: `Value must be at most ${constraint.max_value}` 
        }, { status: 400 })
      }
    }
    
    // Check for duplicate constraint names within tenant
    const { data: existing } = await supabase
      .from('rulesets')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('rule_name', constraint.constraint_name)
      .single()
    
    if (existing) {
      return NextResponse.json({ 
        error: 'Constraint with this name already exists' 
      }, { status: 409 })
    }
    
    // Insert new constraint using rulesets table
    const { data: newConstraint, error } = await supabase
      .from('rulesets')
      .insert({
        tenant_id: user.tenantId,
        rule_name: constraint.constraint_name,
        rule_type: constraint.constraint_type,
        rule_value: constraint.current_value,
        description: constraint.description,
        is_active: constraint.is_enabled,
        config: constraint.config || {},
        created_by: user.employeeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating constraint:', error)
      return NextResponse.json({ 
        error: 'Failed to create constraint' 
      }, { status: 500 })
    }
    
    // Create audit log
    await supabase.from('audit_logs').insert({
      tenant_id: user.tenantId,
      user_id: user.employeeId,
      action: 'constraint_created',
      resource_type: 'constraint_setting',
      resource_id: newConstraint.id,
      details: {
        constraint_name: constraint.constraint_name,
        constraint_type: constraint.constraint_type,
        current_value: constraint.current_value
      }
    })
    
    return NextResponse.json({
      success: true,
      constraint: newConstraint
    })
    
  } catch (error) {
    console.error('Error creating constraint:', error)
    return NextResponse.json({ 
      error: 'Failed to create constraint' 
    }, { status: 500 })
  }
}

// PATCH /api/settings/constraints/[id] - Update constraint
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const constraintId = body.id
    
    if (!constraintId) {
      return NextResponse.json({ error: 'Constraint ID required' }, { status: 400 })
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
    
    // Update constraint
    const { data: constraint, error } = await supabase
      .from('constraint_settings')
      .update({
        is_enabled: body.is_enabled,
        is_hard_constraint: body.is_hard_constraint,
        priority: body.priority,
        current_value: body.current_value,
        config: body.config,
        description: body.description,
        warning_message: body.warning_message,
        updated_at: new Date().toISOString()
      })
      .eq('id', constraintId)
      .eq('tenant_id', employee.tenant_id)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    // Log the change
    await supabase.from('audit_logs').insert({
      tenant_id: employee.tenant_id,
      user_id: user.id,
      action: 'update_constraint',
      entity_type: 'constraint_settings',
      entity_id: constraint.id,
      details: {
        changes: body
      }
    })
    
    return NextResponse.json({
      success: true,
      data: constraint
    })
    
  } catch (error) {
    console.error('Error updating constraint:', error)
    return NextResponse.json(
      { error: 'Failed to update constraint' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/constraints/[id] - Delete constraint
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const constraintId = searchParams.get('id')
    
    if (!constraintId) {
      return NextResponse.json({ error: 'Constraint ID required' }, { status: 400 })
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
    
    // Delete constraint
    const { error } = await supabase
      .from('constraint_settings')
      .delete()
      .eq('id', constraintId)
      .eq('tenant_id', employee.tenant_id)
    
    if (error) {
      throw error
    }
    
    // Log the deletion
    await supabase.from('audit_logs').insert({
      tenant_id: employee.tenant_id,
      user_id: user.id,
      action: 'delete_constraint',
      entity_type: 'constraint_settings',
      entity_id: constraintId,
      details: {}
    })
    
    return NextResponse.json({
      success: true,
      message: 'Constraint deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting constraint:', error)
    return NextResponse.json(
      { error: 'Failed to delete constraint' },
      { status: 500 }
    )
  }
}