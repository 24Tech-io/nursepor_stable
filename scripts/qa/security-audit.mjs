/**
 * Security Audit Script
 * Checks for common security vulnerabilities and misconfigurations
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('🔒 Security Audit');
console.log('='.repeat(70));

const issues = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  passed: [],
};

// Check for hardcoded secrets
function checkHardcodedSecrets() {
  console.log('\n1️⃣ Checking for hardcoded secrets...');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const files = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  let found = 0;
  const patterns = [
    /password\s*=\s*['"][^'"]+['"]/i,
    /secret\s*=\s*['"][^'"]+['"]/i,
    /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
    /token\s*=\s*['"][^'"]{20,}['"]/i,
  ];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of patterns) {
        if (pattern.test(content) && !content.includes('process.env')) {
          found++;
          issues.high.push(`Potential hardcoded secret in ${file}`);
        }
      }
    } catch (e) {
      // Skip files we can't read
    }
  }
  
  if (found === 0) {
    issues.passed.push('No hardcoded secrets found');
    console.log('   ✅ No hardcoded secrets found');
  } else {
    console.log(`   ⚠️  Found ${found} potential hardcoded secrets`);
  }
}

// Check SQL injection vulnerabilities
function checkSQLInjection() {
  console.log('\n2️⃣ Checking for SQL injection vulnerabilities...');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const files = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  let found = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      
      // Check for raw SQL with string interpolation
      if (content.includes('sql`') && content.includes('${')) {
        // Check if using parameterized queries
        if (!content.includes('$1') && !content.includes('eq(') && !content.includes('where(')) {
          found++;
          issues.high.push(`Potential SQL injection in ${file}`);
        }
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (found === 0) {
    issues.passed.push('No SQL injection vulnerabilities found');
    console.log('   ✅ No SQL injection vulnerabilities found');
  } else {
    console.log(`   ⚠️  Found ${found} potential SQL injection issues`);
  }
}

// Check authentication
function checkAuthentication() {
  console.log('\n3️⃣ Checking authentication implementation...');
  
  const authFile = join(projectRoot, 'src/lib/auth.ts');
  try {
    const content = readFileSync(authFile, 'utf-8');
    
    const checks = {
      hasJWT: content.includes('jwt') || content.includes('JWT'),
      hasTokenVerification: content.includes('verify') || content.includes('verifyToken'),
      hasExpiration: content.includes('expiresIn') || content.includes('expires'),
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    if (allPassed) {
      issues.passed.push('Authentication properly implemented');
      console.log('   ✅ Authentication checks passed');
    } else {
      issues.medium.push('Authentication may need improvements');
      console.log('   ⚠️  Some authentication checks failed');
    }
  } catch (e) {
    issues.medium.push('Could not verify authentication');
    console.log('   ⚠️  Could not check authentication');
  }
}

// Check authorization
function checkAuthorization() {
  console.log('\n4️⃣ Checking authorization...');
  
  const middlewareFile = join(projectRoot, 'src/middleware.ts');
  try {
    const content = readFileSync(middlewareFile, 'utf-8');
    
    const hasRoleCheck = content.includes('role') || content.includes('admin') || content.includes('student');
    const hasTokenCheck = content.includes('token') || content.includes('verifyToken');
    
    if (hasRoleCheck && hasTokenCheck) {
      issues.passed.push('Authorization checks found');
      console.log('   ✅ Authorization checks found');
    } else {
      issues.medium.push('Authorization may need improvements');
      console.log('   ⚠️  Authorization needs review');
    }
  } catch (e) {
    issues.medium.push('Could not verify authorization');
    console.log('   ⚠️  Could not check authorization');
  }
}

// Check CORS configuration
function checkCORS() {
  console.log('\n5️⃣ Checking CORS configuration...');
  
  const middlewareFile = join(projectRoot, 'src/middleware.ts');
  const configFile = join(projectRoot, 'src/lib/config.ts');
  
  try {
    const middlewareContent = readFileSync(middlewareFile, 'utf-8');
    const configContent = readFileSync(configFile, 'utf-8');
    
    const hasCORS = middlewareContent.includes('CORS') || middlewareContent.includes('Access-Control');
    const usesEnvVars = configContent.includes('process.env') || configContent.includes('env.');
    
    if (hasCORS && usesEnvVars) {
      issues.passed.push('CORS properly configured');
      console.log('   ✅ CORS uses environment variables');
    } else if (hasCORS) {
      issues.medium.push('CORS may use hardcoded values');
      console.log('   ⚠️  CORS may need environment variables');
    } else {
      issues.high.push('CORS not configured');
      console.log('   ❌ CORS not found');
    }
  } catch (e) {
    issues.medium.push('Could not verify CORS');
    console.log('   ⚠️  Could not check CORS');
  }
}

// Check input validation
function checkInputValidation() {
  console.log('\n6️⃣ Checking input validation...');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const files = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  let validated = 0;
  let unvalidated = 0;
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      
      // Check if endpoint has validation
      if (content.includes('request.json()') || content.includes('request.body')) {
        if (content.includes('if (!') || content.includes('validate') || content.includes('zod') || content.includes('validator')) {
          validated++;
        } else {
          unvalidated++;
        }
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (unvalidated === 0) {
    issues.passed.push('All endpoints have input validation');
    console.log('   ✅ Input validation found');
  } else {
    issues.medium.push(`${unvalidated} endpoints may lack input validation`);
    console.log(`   ⚠️  ${unvalidated} endpoints may need validation`);
  }
}

// Check file upload security
function checkFileUploadSecurity() {
  console.log('\n7️⃣ Checking file upload security...');
  
  const uploadFiles = [
    join(projectRoot, 'src/app/api/upload/route.ts'),
    join(projectRoot, 'src/app/api/profile/upload-picture/route.ts'),
  ];
  
  let secure = 0;
  for (const file of uploadFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      
      const checks = {
        typeCheck: content.includes('file.type') || content.includes('allowedTypes'),
        sizeCheck: content.includes('file.size') || content.includes('MAX_FILE_SIZE'),
        extensionCheck: content.includes('extension') || content.includes('blockedExtensions'),
      };
      
      if (Object.values(checks).every(v => v)) {
        secure++;
      }
    } catch (e) {
      // File doesn't exist
    }
  }
  
  if (secure === uploadFiles.length) {
    issues.passed.push('File uploads properly secured');
    console.log('   ✅ File upload security checks passed');
  } else {
    issues.medium.push('File upload security may need improvements');
    console.log(`   ⚠️  ${secure}/${uploadFiles.length} upload endpoints secured`);
  }
}

// Check rate limiting
function checkRateLimiting() {
  console.log('\n8️⃣ Checking rate limiting...');
  
  const middlewareFile = join(projectRoot, 'src/middleware.ts');
  try {
    const content = readFileSync(middlewareFile, 'utf-8');
    
    if (content.includes('rate') || content.includes('RateLimit') || content.includes('rate-limit')) {
      issues.passed.push('Rate limiting implemented');
      console.log('   ✅ Rate limiting found');
    } else {
      issues.medium.push('Rate limiting not found');
      console.log('   ⚠️  Rate limiting not found');
    }
  } catch (e) {
    issues.medium.push('Could not verify rate limiting');
    console.log('   ⚠️  Could not check rate limiting');
  }
}

// Check security headers
function checkSecurityHeaders() {
  console.log('\n9️⃣ Checking security headers...');
  
  const middlewareFile = join(projectRoot, 'src/middleware.ts');
  try {
    const content = readFileSync(middlewareFile, 'utf-8');
    
    const headers = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy',
      'X-XSS-Protection',
    ];
    
    let found = 0;
    for (const header of headers) {
      if (content.includes(header)) {
        found++;
      }
    }
    
    if (found === headers.length) {
      issues.passed.push('All security headers configured');
      console.log('   ✅ All security headers found');
    } else {
      issues.medium.push(`Only ${found}/${headers.length} security headers configured`);
      console.log(`   ⚠️  ${found}/${headers.length} security headers found`);
    }
  } catch (e) {
    issues.medium.push('Could not verify security headers');
    console.log('   ⚠️  Could not check security headers');
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n🔟 Checking environment variables...');
  
  const envExample = join(projectRoot, '.env.example');
  try {
    const content = readFileSync(envExample, 'utf-8');
    
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    let found = 0;
    
    for (const req of required) {
      if (content.includes(req)) {
        found++;
      }
    }
    
    if (found === required.length) {
      issues.passed.push('Required environment variables documented');
      console.log('   ✅ Required env vars documented');
    } else {
      issues.medium.push('Some required env vars may be missing');
      console.log(`   ⚠️  ${found}/${required.length} required vars documented`);
    }
  } catch (e) {
    issues.low.push('Could not check environment variables');
    console.log('   ⚠️  Could not check env vars');
  }
}

// Helper function
function getAllFiles(dir, extensions = []) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const filePath = join(dir, file);
      try {
        const stat = statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllFiles(filePath, extensions));
        } else {
          if (extensions.length === 0 || extensions.some(ext => file.endsWith(ext))) {
            results.push(filePath);
          }
        }
      } catch (e) {
        // Skip
      }
    }
  } catch (e) {
    // Skip
  }
  return results;
}

// Main audit
async function runSecurityAudit() {
  checkHardcodedSecrets();
  checkSQLInjection();
  checkAuthentication();
  checkAuthorization();
  checkCORS();
  checkInputValidation();
  checkFileUploadSecurity();
  checkRateLimiting();
  checkSecurityHeaders();
  checkEnvironmentVariables();
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SECURITY AUDIT SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${issues.passed.length}`);
  console.log(`🔴 Critical: ${issues.critical.length}`);
  console.log(`⚠️  High: ${issues.high.length}`);
  console.log(`🟡 Medium: ${issues.medium.length}`);
  console.log(`🟢 Low: ${issues.low.length}`);
  
  if (issues.critical.length > 0) {
    console.log('\n🔴 Critical Issues:');
    issues.critical.forEach(issue => console.log(`   - ${issue}`));
  }
  
  if (issues.high.length > 0) {
    console.log('\n⚠️  High Priority Issues:');
    issues.high.forEach(issue => console.log(`   - ${issue}`));
  }
  
  if (issues.medium.length > 0) {
    console.log('\n🟡 Medium Priority Issues:');
    issues.medium.forEach(issue => console.log(`   - ${issue}`));
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: issues.passed.length,
      critical: issues.critical.length,
      high: issues.high.length,
      medium: issues.medium.length,
      low: issues.low.length,
    },
    issues,
  };
  
  const fs = await import('fs');
  const reportPath = join(projectRoot, 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

runSecurityAudit().catch(console.error);


