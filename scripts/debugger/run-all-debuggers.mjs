/**
 * Run All Debuggers
 * Executes all debugging scripts and generates comprehensive report
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const debuggers = [
  { name: 'Database Sync', script: 'debug-database-sync.mjs' },
  { name: 'API Endpoints', script: 'debug-api-endpoints.mjs' },
  { name: 'Enrollment Sync', script: 'debug-enrollment-sync.mjs' },
];

async function runDebugger(name, script) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Running ${name} debugger...`);
    console.log('='.repeat(70));

    const scriptPath = join(__dirname, script);
    const process = spawn('node', [scriptPath], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} debugger completed`);
        resolve({ name, success: true });
      } else {
        console.log(`⚠️  ${name} debugger exited with code ${code}`);
        resolve({ name, success: false, code });
      }
    });

    process.on('error', (error) => {
      console.error(`❌ Error running ${name} debugger:`, error);
      reject({ name, error });
    });
  });
}

async function generateCombinedReport() {
  console.log('\n📊 Generating combined report...');

  const reports = {};
  
  // Try to load individual reports
  try {
    const syncReport = JSON.parse(readFileSync(join(projectRoot, 'debug-sync-report.json'), 'utf-8'));
    reports.sync = syncReport;
  } catch (e) {
    console.log('   ⚠️  Could not load sync report');
  }

  try {
    const apiReport = JSON.parse(readFileSync(join(projectRoot, 'debug-api-report.json'), 'utf-8'));
    reports.api = apiReport;
  } catch (e) {
    console.log('   ⚠️  Could not load API report');
  }

  const combinedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      syncIssues: reports.sync?.summary?.totalIssues || 0,
      apiWorking: reports.api?.summary?.working || 0,
      apiBroken: reports.api?.summary?.broken || 0,
    },
    reports,
  };

  writeFileSync(
    join(projectRoot, 'debug-combined-report.json'),
    JSON.stringify(combinedReport, null, 2)
  );

  console.log('   ✅ Combined report generated: debug-combined-report.json');
}

async function main() {
  console.log('🚀 Running All Debuggers');
  console.log('='.repeat(70));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = [];

  for (const debugger of debuggers) {
    try {
      const result = await runDebugger(debugger.name, debugger.script);
      results.push(result);
    } catch (error) {
      console.error(`❌ Failed to run ${debugger.name}:`, error);
      results.push({ name: debugger.name, success: false, error: error.message });
    }
  }

  // Generate combined report
  await generateCombinedReport();

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 DEBUGGING SUMMARY');
  console.log('='.repeat(70));

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: Completed`);
    } else {
      console.log(`❌ ${result.name}: Failed`);
    }
  });

  console.log(`\n📅 Completed: ${new Date().toISOString()}`);
  console.log('\n📁 Check individual reports:');
  console.log('   - debug-sync-report.json');
  console.log('   - debug-api-report.json');
  console.log('   - debug-combined-report.json');
}

main().catch(console.error);


