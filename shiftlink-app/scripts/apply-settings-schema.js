const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQL(sql) {
  const { data, error } = await supabase.rpc('exec', { sql })
  if (error) {
    console.error('SQL Error:', error)
    throw error
  }
  return data
}

async function applySettingsSchema() {
  try {
    console.log('🚀 Applying Settings Management Schema...')
    
    const schemaPath = path.join(__dirname, '..', 'supabase', 'settings_management_fixed.sql')
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
    
    // Split by main sections and execute individually
    const sections = schemaSQL.split('-- ==============================================')
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim()
      if (!section) continue
      
      console.log(`📝 Executing section ${i + 1}/${sections.length}...`)
      console.log(`   ${section.substring(0, 60).replace(/\n/g, ' ')}...`)
      
      try {
        // Further split by individual statements
        const statements = section.split(';').filter(stmt => stmt.trim())
        
        for (const statement of statements) {
          const cleanStmt = statement.trim()
          if (cleanStmt && !cleanStmt.startsWith('--')) {
            await executeSQL(cleanStmt)
          }
        }
        
        console.log(`   ✅ Section ${i + 1} completed`)
        
      } catch (error) {
        console.error(`   ❌ Error in section ${i + 1}:`, error.message)
        // Continue with other sections
      }
    }
    
    console.log('\n✨ Schema application completed!')
    
    // Test if tables were created
    const { data: tables } = await supabase.rpc('exec', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'tenant_settings',
          'constraint_settings', 
          'schedule_rules',
          'simulation_configs',
          'setting_presets',
          'setting_history'
        )
        ORDER BY table_name;
      `
    })
    
    console.log('\n📊 Created tables:', tables?.map(t => t.table_name) || [])
    
  } catch (error) {
    console.error('❌ Schema application failed:', error)
    process.exit(1)
  }
}

applySettingsSchema()