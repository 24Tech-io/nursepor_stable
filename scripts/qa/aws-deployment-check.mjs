/**
 * AWS Deployment Readiness Check
 * Verifies configuration and requirements for AWS deployment
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('☁️  AWS Deployment Readiness Check');
console.log('='.repeat(70));

const checks = {
  passed: [],
  failed: [],
  warnings: [],
};

// Check 1: Environment Variables
function checkEnvironmentVariables() {
  console.log('\n1️⃣ Checking environment variables...');
  
  const envExample = join(projectRoot, '.env.example');
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  try {
    const content = readFileSync(envExample, 'utf-8');
    let found = 0;
    
    for (const varName of requiredVars) {
      if (content.includes(varName)) {
        found++;
      }
    }
    
    if (found === requiredVars.length) {
      checks.passed.push('All required environment variables documented');
      console.log('   ✅ Required env vars documented');
    } else {
      checks.warnings.push(`Only ${found}/${requiredVars.length} required vars documented`);
      console.log(`   ⚠️  ${found}/${requiredVars.length} required vars documented`);
    }
  } catch (e) {
    checks.failed.push('Could not check environment variables');
    console.log('   ❌ Could not check env vars');
  }
}

// Check 2: Database Configuration
function checkDatabaseConfig() {
  console.log('\n2️⃣ Checking database configuration...');
  
  const dbFile = join(projectRoot, 'src/lib/db/index.ts');
  try {
    const content = readFileSync(dbFile, 'utf-8');
    
    if (content.includes('DATABASE_URL') && content.includes('process.env')) {
      checks.passed.push('Database uses environment variables');
      console.log('   ✅ Database configured for environment variables');
    } else {
      checks.failed.push('Database may use hardcoded values');
      console.log('   ❌ Database configuration needs review');
    }
  } catch (e) {
    checks.warnings.push('Could not verify database configuration');
    console.log('   ⚠️  Could not check database config');
  }
}

// Check 3: Next.js Configuration
function checkNextConfig() {
  console.log('\n3️⃣ Checking Next.js configuration...');
  
  const nextConfig = join(projectRoot, 'next.config.js');
  if (existsSync(nextConfig)) {
    try {
      const content = readFileSync(nextConfig, 'utf-8');
      
      const hasOutput = content.includes('output') || content.includes('standalone');
      const hasEnv = content.includes('env') || content.includes('process.env');
      
      if (hasOutput || hasEnv) {
        checks.passed.push('Next.js config has deployment settings');
        console.log('   ✅ Next.js config looks good');
      } else {
        checks.warnings.push('Next.js config may need deployment settings');
        console.log('   ⚠️  Next.js config needs review');
      }
    } catch (e) {
      checks.warnings.push('Could not read Next.js config');
      console.log('   ⚠️  Could not read Next.js config');
    }
  } else {
    checks.warnings.push('next.config.js not found');
    console.log('   ⚠️  next.config.js not found');
  }
}

// Check 4: Build Scripts
function checkBuildScripts() {
  console.log('\n4️⃣ Checking build scripts...');
  
  const packageJson = join(projectRoot, 'package.json');
  try {
    const content = readFileSync(packageJson, 'utf-8');
    const pkg = JSON.parse(content);
    
    const hasBuild = pkg.scripts && pkg.scripts.build;
    const hasStart = pkg.scripts && pkg.scripts.start;
    
    if (hasBuild && hasStart) {
      checks.passed.push('Build and start scripts configured');
      console.log('   ✅ Build scripts found');
    } else {
      checks.failed.push('Missing build or start scripts');
      console.log('   ❌ Build scripts missing');
    }
  } catch (e) {
    checks.failed.push('Could not check build scripts');
    console.log('   ❌ Could not check build scripts');
  }
}

// Check 5: CORS Configuration
function checkCORS() {
  console.log('\n5️⃣ Checking CORS configuration...');
  
  const configFile = join(projectRoot, 'src/lib/config.ts');
  try {
    const content = readFileSync(configFile, 'utf-8');
    
    if (content.includes('process.env') || content.includes('env.')) {
      checks.passed.push('CORS uses environment variables');
      console.log('   ✅ CORS configured for environment variables');
    } else {
      checks.warnings.push('CORS may use hardcoded values');
      console.log('   ⚠️  CORS needs environment variables');
    }
  } catch (e) {
    checks.warnings.push('Could not verify CORS');
    console.log('   ⚠️  Could not check CORS');
  }
}

// Check 6: Logging Configuration
function checkLogging() {
  console.log('\n6️⃣ Checking logging configuration...');
  
  const loggerFile = join(projectRoot, 'src/lib/logger.ts');
  if (existsSync(loggerFile)) {
    checks.passed.push('Logging system implemented');
    console.log('   ✅ Logging system found');
  } else {
    checks.warnings.push('Logging system not found');
    console.log('   ⚠️  Logging system not found');
  }
}

// Check 7: Error Handling
function checkErrorHandling() {
  console.log('\n7️⃣ Checking error handling...');
  
  const errorHandler = join(projectRoot, 'src/lib/error-handler.ts');
  if (existsSync(errorHandler)) {
    checks.passed.push('Error handler implemented');
    console.log('   ✅ Error handler found');
  } else {
    checks.warnings.push('Error handler not found');
    console.log('   ⚠️  Error handler not found');
  }
}

// Check 8: Health Check Endpoint
function checkHealthEndpoint() {
  console.log('\n8️⃣ Checking health check endpoint...');
  
  const healthFile = join(projectRoot, 'src/app/api/health/route.ts');
  if (existsSync(healthFile)) {
    checks.passed.push('Health check endpoint exists');
    console.log('   ✅ Health check endpoint found');
  } else {
    checks.warnings.push('Health check endpoint not found');
    console.log('   ⚠️  Health check endpoint not found');
  }
}

// Check 9: Static Files
function checkStaticFiles() {
  console.log('\n9️⃣ Checking static files configuration...');
  
  const publicDir = join(projectRoot, 'public');
  if (existsSync(publicDir)) {
    checks.passed.push('Public directory exists');
    console.log('   ✅ Public directory found');
  } else {
    checks.warnings.push('Public directory not found');
    console.log('   ⚠️  Public directory not found');
  }
}

// Check 10: Dependencies
function checkDependencies() {
  console.log('\n🔟 Checking dependencies...');
  
  const packageJson = join(projectRoot, 'package.json');
  try {
    const content = readFileSync(packageJson, 'utf-8');
    const pkg = JSON.parse(content);
    
    const required = ['next', 'react', 'react-dom'];
    let found = 0;
    
    for (const dep of required) {
      if (pkg.dependencies && pkg.dependencies[dep]) {
        found++;
      }
    }
    
    if (found === required.length) {
      checks.passed.push('Required dependencies present');
      console.log('   ✅ Required dependencies found');
    } else {
      checks.failed.push('Missing required dependencies');
      console.log(`   ❌ ${found}/${required.length} required dependencies found`);
    }
  } catch (e) {
    checks.failed.push('Could not check dependencies');
    console.log('   ❌ Could not check dependencies');
  }
}

// Main check
async function runAWSDeploymentCheck() {
  checkEnvironmentVariables();
  checkDatabaseConfig();
  checkNextConfig();
  checkBuildScripts();
  checkCORS();
  checkLogging();
  checkErrorHandling();
  checkHealthEndpoint();
  checkStaticFiles();
  checkDependencies();
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 AWS DEPLOYMENT READINESS SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${checks.passed.length}`);
  console.log(`❌ Failed: ${checks.failed.length}`);
  console.log(`⚠️  Warnings: ${checks.warnings.length}`);
  
  if (checks.passed.length > 0) {
    console.log('\n✅ Passed Checks:');
    checks.passed.forEach(check => console.log(`   - ${check}`));
  }
  
  if (checks.failed.length > 0) {
    console.log('\n❌ Failed Checks:');
    checks.failed.forEach(check => console.log(`   - ${check}`));
  }
  
  if (checks.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    checks.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  // Calculate readiness score
  const total = checks.passed.length + checks.failed.length + checks.warnings.length;
  const score = (checks.passed.length / total) * 100;
  
  console.log(`\n📊 Readiness Score: ${score.toFixed(1)}%`);
  
  if (score >= 80) {
    console.log('✅ Ready for AWS deployment');
  } else if (score >= 60) {
    console.log('⚠️  Mostly ready, but some issues need attention');
  } else {
    console.log('❌ Not ready for AWS deployment - fix critical issues first');
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: checks.passed.length,
      failed: checks.failed.length,
      warnings: checks.warnings.length,
      score: score.toFixed(1),
    },
    checks,
  };
  
  const fs = await import('fs');
  const reportPath = join(projectRoot, 'aws-deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

runAWSDeploymentCheck().catch(console.error);


