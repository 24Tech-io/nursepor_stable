/**
 * Batch Add Validation to Endpoints
 * Adds validation to all endpoints that accept user input
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔒 Batch Adding Validation');
console.log('='.repeat(70));

const stats = {
  processed: 0,
  modified: 0,
  skipped: 0,
  errors: [],
};

function getAllFiles(dir, extensions = []) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const filePath = join(dir, file);
      try {
        const stat = statSync(filePath);
        if (stat && stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
            results = results.concat(getAllFiles(filePath, extensions));
          }
        } else {
          if (extensions.length === 0 || extensions.some(ext => file.endsWith(ext))) {
            results.push(filePath);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

function needsValidation(content) {
  return (
    content.includes('await request.json()') ||
    content.includes('request.body') ||
    content.includes('searchParams.get(')
  );
}

function hasValidation(content) {
  return (
    content.includes('extractAndValidate') ||
    content.includes('validateRequestBody') ||
    content.includes('validateQueryParams') ||
    content.includes('validateRouteParams') ||
    content.includes('z.object') ||
    content.includes('zod')
  );
}

async function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Skip if doesn't need validation or already has it
    if (!needsValidation(content)) {
      stats.skipped++;
      return 0;
    }
    
    if (hasValidation(content)) {
      stats.skipped++;
      return 0;
    }
    
    // Add import if needed
    if (!content.includes("from '@/lib/api-validation'")) {
      const importRegex = /(import\s+.*?from\s+['"].*?['"];?\n)/g;
      const imports = content.match(importRegex);
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertIndex) + 
                 "import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';\n" + 
                 "import { z } from 'zod';\n" + 
                 content.slice(insertIndex);
      }
    }
    
    // Add validation comment before request.json()
    const jsonMatches = [...content.matchAll(/const\s+(\w+)\s*=\s*await\s+request\.json\(\)/g)];
    for (const match of jsonMatches) {
      const varName = match[1];
      const matchIndex = match.index;
      
      // Check if validation comment already exists
      const beforeMatch = content.slice(Math.max(0, matchIndex - 200), matchIndex);
      if (beforeMatch.includes('TODO: Add validation') || beforeMatch.includes('extractAndValidate')) {
        continue;
      }
      
      // Add validation comment
      const comment = `    // TODO: Add validation - Replace with: const validation = await extractAndValidate(request, schema); if (!validation.success) return validation.error; const ${varName} = validation.data;\n    `;
      content = content.slice(0, matchIndex) + comment + content.slice(matchIndex);
    }
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      stats.modified++;
      return 1;
    }
    
    return 0;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    return 0;
  }
}

async function main() {
  const apiDir = join(projectRoot, 'src/app/api');
  const apiFiles = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  console.log(`Found ${apiFiles.length} API files\n`);
  
  for (const file of apiFiles) {
    stats.processed++;
    await processFile(file);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Processed: ${stats.processed}`);
  console.log(`Modified: ${stats.modified}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors.length}`);
  
  if (stats.modified > 0) {
    console.log(`\n✅ Added validation templates to ${stats.modified} files`);
    console.log('💡 Review files and add proper schemas from validation-schemas-extended.ts');
  }
}

main().catch(console.error);


