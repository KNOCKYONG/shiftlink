#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 ShiftLink Beta Test Environment Validation\n');

const checks = [];

// 1. Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
checks.push({
  name: 'Node.js Version',
  status: majorVersion >= 18 ? '✅' : '❌',
  message: `${nodeVersion} (Required: >=18.0.0)`,
});

// 2. Check essential files
const essentialFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  '.env.local',
  'app/layout.tsx',
  'app/globals.css',
];

essentialFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  checks.push({
    name: `File: ${file}`,
    status: exists ? '✅' : '❌',
    message: exists ? 'Found' : 'Missing',
  });
});

// 3. Check environment variables
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  requiredEnvVars.forEach(envVar => {
    const hasVar = envContent.includes(envVar) && !envContent.includes(`${envVar}=your_`);
    checks.push({
      name: `Env: ${envVar}`,
      status: hasVar ? '✅' : '⚠️',
      message: hasVar ? 'Configured' : 'Not configured',
    });
  });
}

// 4. Check dependencies
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const requiredDeps = ['next', 'react', 'react-dom', '@supabase/supabase-js'];
  
  requiredDeps.forEach(dep => {
    const hasDep = packageJson.dependencies && packageJson.dependencies[dep];
    checks.push({
      name: `Dependency: ${dep}`,
      status: hasDep ? '✅' : '❌',
      message: hasDep ? `v${packageJson.dependencies[dep]}` : 'Missing',
    });
  });
}

// 5. Check Supabase SQL files
const sqlFiles = [
  'supabase/1_add_enum_values.sql',
  'supabase/add_shift_types_and_setup.sql',
  'supabase/setup_rls_policies_fixed.sql',
];

sqlFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  checks.push({
    name: `SQL: ${file.split('/').pop()}`,
    status: exists ? '✅' : '⚠️',
    message: exists ? 'Ready' : 'Missing',
  });
});

// Print results
console.log('📋 Validation Results:\n');
console.log('─'.repeat(60));

let hasErrors = false;
let hasWarnings = false;

checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(35)} ${check.message}`);
  if (check.status === '❌') hasErrors = true;
  if (check.status === '⚠️') hasWarnings = true;
});

console.log('─'.repeat(60));

// Summary
if (hasErrors) {
  console.log('\n❌ Critical issues found. Please fix the errors above.');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Configure your .env.local file with Supabase credentials');
  console.log('3. Run SQL scripts in Supabase');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  Some warnings found, but you can proceed.');
  console.log('\nNext steps:');
  console.log('1. Configure your .env.local file with Supabase credentials');
  console.log('2. Run SQL scripts in Supabase:');
  console.log('   - 1_add_enum_values.sql');
  console.log('   - add_shift_types_and_setup.sql');
  console.log('   - setup_rls_policies_fixed.sql');
  console.log('3. Run: npm run dev');
} else {
  console.log('\n✅ Environment is ready for beta testing!');
  console.log('\nYou can now run: npm run dev');
}

console.log('\n📚 For detailed setup instructions, see BETA_TEST_GUIDE.md');