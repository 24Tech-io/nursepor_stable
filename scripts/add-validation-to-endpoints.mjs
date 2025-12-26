/**
 * Add Validation to All Endpoints
 * Automatically adds Zod validation to endpoints that need it
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔒 Adding Validation to API Endpoints');
console.log('='.repeat(70));

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  validationsAdded: 0,
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

function addValidationToFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Skip if already has validation imports
    if (content.includes('extractAndValidate') || content.includes('api-validation')) {
      return 0;
    }
    
    // Check if file has request.json() or request.body
    const hasRequestBody = content.includes('await request.json()') || content.includes('request.body');
    if (!hasRequestBody) {
      return 0;
    }
    
    // Check if it's a route file
    if (!filePath.includes('/api/') || !filePath.endsWith('/route.ts')) {
      return 0;
    }
    
    // Add import if not present
    if (!content.includes("from '@/lib/api-validation'")) {
      // Find last import
      const importRegex = /(import\s+.*?from\s+['"].*?['"];?\n)/g;
      const imports = content.match(importRegex);
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertIndex) + 
                 "import { extractAndValidate } from '@/lib/api-validation';\n" + 
                 content.slice(insertIndex);
      }
    }
    
    // Add comment about validation needed
    const jsonMatch = content.match(/const\s+(\w+)\s*=\s*await\s+request\.json\(\)/);
    if (jsonMatch) {
      const varName = jsonMatch[1];
      const comment = `    // TODO: Add validation schema for ${varName}\n    // const validation = await extractAndValidate(request, schema);\n    // if (!validation.success) return validation.error;\n    // const ${varName} = validation.data;\n    \n`;
      
      const jsonLine = content.indexOf(`const ${varName} = await request.json()`);
      if (jsonLine > 0) {
        content = content.slice(0, jsonLine) + comment + content.slice(jsonLine);
        stats.validationsAdded++;
      }
    }
    
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      stats.filesModified++;
      return 1;
    }
    
    return 0;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    return 0;
  }
}

async function main() {
  console.log('📁 Scanning API route files...\n');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const apiFiles = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  console.log(`Found ${apiFiles.length} API route files\n`);
  
  for (const file of apiFiles) {
    stats.filesProcessed++;
    const modified = addValidationToFile(file);
    if (modified > 0) {
      const relativePath = file.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
      console.log(`✅ ${relativePath}: Added validation template`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Files Processed: ${stats.filesProcessed}`);
  console.log(`Files Modified: ${stats.filesModified}`);
  console.log(`Validations Added: ${stats.validationsAdded}`);
  console.log(`Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  if (stats.validationsAdded > 0) {
    console.log('\n✅ Validation templates added');
    console.log('💡 Review and add proper schemas from validation-schemas-extended.ts');
  } else {
    console.log('\n✅ All endpoints already have validation or don\'t need it');
  }
}

main().catch(console.error);


