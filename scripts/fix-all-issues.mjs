/**
 * Comprehensive Fix Implementation Script
 * Automatically fixes identified issues in the codebase
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔧 Comprehensive Fix Implementation');
console.log('='.repeat(70));

const fixes = {
  applied: [],
  skipped: [],
  errors: [],
};

// Fix #1: Replace console.log with logger in API routes
async function fixConsoleLogs() {
  console.log('\n1️⃣ Fixing console.log statements...');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const files = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  let replaced = 0;
  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      const originalContent = content;
      
      // Replace console.log with logger
      content = content.replace(/console\.log\(/g, 'logger.info(');
      content = content.replace(/console\.error\(/g, 'logger.error(');
      content = content.replace(/console\.warn\(/g, 'logger.warn(');
      content = content.replace(/console\.info\(/g, 'logger.info(');
      content = content.replace(/console\.debug\(/g, 'logger.debug(');
      
      // Add logger import if console was used and logger not imported
      if (content !== originalContent && !content.includes("import { logger }")) {
        // Find the last import statement
        const importMatch = content.match(/(import .+ from ['"].+['"];?\n)+/);
        if (importMatch) {
          const lastImport = importMatch[0].split('\n').filter(l => l.trim()).pop();
          const insertIndex = content.indexOf(lastImport) + lastImport.length;
          content = content.slice(0, insertIndex) + 
                   "\nimport { logger } from '@/lib/logger';" + 
                   content.slice(insertIndex);
        } else {
          // Add at top if no imports
          const firstLine = content.split('\n')[0];
          content = "import { logger } from '@/lib/logger';\n" + content;
        }
      }
      
      if (content !== originalContent) {
        writeFileSync(file, content, 'utf-8');
        replaced++;
        fixes.applied.push(`Replaced console.* with logger in ${file}`);
      }
    } catch (error) {
      fixes.errors.push(`Error fixing ${file}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Replaced console.* in ${replaced} files`);
}

// Fix #2: Standardize status values to lowercase
async function fixStatusCase() {
  console.log('\n2️⃣ Fixing status case inconsistency...');
  
  const files = [
    join(projectRoot, 'src/app/api/admin/students/[id]/route.ts'),
    join(projectRoot, 'src/app/api/student/courses/route.ts'),
    join(projectRoot, 'src/app/api/student/enroll/route.ts'),
  ];
  
  let fixed = 0;
  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      const originalContent = content;
      
      // Replace 'Published' with 'published', 'Active' with 'active'
      content = content.replace(/['"]Published['"]/g, "'published'");
      content = content.replace(/['"]Active['"]/g, "'active'");
      content = content.replace(/status\s*===\s*['"]Published['"]/g, "status === 'published'");
      content = content.replace(/status\s*===\s*['"]Active['"]/g, "status === 'active'");
      
      if (content !== originalContent) {
        writeFileSync(file, content, 'utf-8');
        fixed++;
        fixes.applied.push(`Fixed status case in ${file}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        fixes.errors.push(`Error fixing ${file}: ${error.message}`);
      }
    }
  }
  
  console.log(`   ✅ Fixed status case in ${fixed} files`);
}

// Fix #3: Enhance file upload validation
async function enhanceFileUploadValidation() {
  console.log('\n3️⃣ Enhancing file upload validation...');
  
  const uploadFile = join(projectRoot, 'src/app/api/upload/route.ts');
  try {
    let content = readFileSync(uploadFile, 'utf-8');
    
    // Check if already has comprehensive validation
    if (content.includes('SecurityConfig') || content.includes('comprehensive validation')) {
      fixes.skipped.push('File upload already has validation');
      return;
    }
    
    // Add more comprehensive validation
    const validationCode = `
        // Enhanced file validation
        const SecurityConfig = {
          fileUpload: {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            blockedExtensions: ['exe', 'bat', 'sh', 'php', 'js', 'html', 'htm', 'svg', 'xml'],
          }
        };
        
        // Validate file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension && SecurityConfig.fileUpload.blockedExtensions.includes(fileExtension)) {
          return NextResponse.json({
            message: 'File type not allowed for security reasons'
          }, { status: 400 });
        }
        
        // Validate MIME type matches extension
        const expectedMimeTypes: Record<string, string[]> = {
          'jpg': ['image/jpeg', 'image/jpg'],
          'jpeg': ['image/jpeg', 'image/jpg'],
          'png': ['image/png'],
          'webp': ['image/webp'],
        };
        
        if (fileExtension && expectedMimeTypes[fileExtension]) {
          if (!expectedMimeTypes[fileExtension].includes(file.type)) {
            return NextResponse.json({
              message: 'File type mismatch detected'
            }, { status: 400 });
          }
        }
    `;
    
    // Insert before file size check
    const insertPoint = content.indexOf('// Validate file size');
    if (insertPoint > 0) {
      content = content.slice(0, insertPoint) + validationCode + '\n        ' + content.slice(insertPoint);
      writeFileSync(uploadFile, content, 'utf-8');
      fixes.applied.push('Enhanced file upload validation');
      console.log('   ✅ Enhanced file upload validation');
    }
  } catch (error) {
    fixes.errors.push(`Error enhancing upload validation: ${error.message}`);
  }
}

// Helper: Get all files recursively
function getAllFiles(dir, extensions = []) {
  let results = [];
  const list = readdirSync(dir);
  
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extensions));
    } else {
      if (extensions.length === 0 || extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

// Main execution
async function main() {
  console.log('Starting comprehensive fixes...\n');
  
  await fixConsoleLogs();
  await fixStatusCase();
  await enhanceFileUploadValidation();
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Applied: ${fixes.applied.length} fixes`);
  console.log(`⏭️  Skipped: ${fixes.skipped.length} (already fixed)`);
  console.log(`❌ Errors: ${fixes.errors.length}`);
  
  if (fixes.applied.length > 0) {
    console.log('\n✅ Applied Fixes:');
    fixes.applied.forEach(fix => console.log(`   - ${fix}`));
  }
  
  if (fixes.errors.length > 0) {
    console.log('\n❌ Errors:');
    fixes.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  console.log('\n💡 Note: Some fixes require manual review');
  console.log('   - Review replaced console.log statements');
  console.log('   - Test file upload validation');
  console.log('   - Verify status case fixes');
}

main().catch(console.error);


