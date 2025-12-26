/**
 * Replace console.log statements with logger
 * Processes API route files to replace console.* with logger.*
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔄 Replacing console.log with logger...');
console.log('='.repeat(70));

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: 0,
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
          // Skip node_modules and .next
          if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
            results = results.concat(getAllFiles(filePath, extensions));
          }
        } else {
          if (extensions.length === 0 || extensions.some(ext => file.endsWith(ext))) {
            results.push(filePath);
          }
        }
      } catch (e) {
        // Skip files we can't access
      }
    }
  } catch (e) {
    // Skip directories we can't access
  }
  
  return results;
}

function replaceConsoleLogs(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let replacements = 0;

    // Replace console methods
    const replacements_map = [
      { from: /console\.log\(/g, to: 'logger.info(' },
      { from: /console\.error\(/g, to: 'logger.error(' },
      { from: /console\.warn\(/g, to: 'logger.warn(' },
      { from: /console\.info\(/g, to: 'logger.info(' },
      { from: /console\.debug\(/g, to: 'logger.debug(' },
    ];

    replacements_map.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches) {
        replacements += matches.length;
        content = content.replace(from, to);
      }
    });

    // Only modify if there were replacements
    if (replacements > 0) {
      // Check if logger is already imported
      const hasLoggerImport = /import.*logger.*from.*['"]@\/lib\/logger['"]/.test(content);
      
      if (!hasLoggerImport) {
        // Find the last import statement
        const importRegex = /(import\s+.*?from\s+['"].*?['"];?\n)/g;
        const imports = content.match(importRegex);
        
        if (imports && imports.length > 0) {
          // Find the position after the last import
          const lastImport = imports[imports.length - 1];
          const lastImportIndex = content.lastIndexOf(lastImport);
          const insertIndex = lastImportIndex + lastImport.length;
          
          // Add logger import
          content = content.slice(0, insertIndex) + 
                   "import { logger } from '@/lib/logger';\n" + 
                   content.slice(insertIndex);
        } else {
          // No imports found, add at the top
          const firstLine = content.split('\n')[0];
          const insertIndex = content.indexOf(firstLine);
          content = content.slice(0, insertIndex) + 
                   "import { logger } from '@/lib/logger';\n" + 
                   content.slice(insertIndex);
        }
      }

      writeFileSync(filePath, content, 'utf-8');
      stats.filesModified++;
      stats.replacements += replacements;
      return replacements;
    }
    
    return 0;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    return 0;
  }
}

async function main() {
  console.log('📁 Scanning API route files...\n');
  
  // Process API routes first (most critical)
  const apiDir = join(projectRoot, 'src/app/api');
  const apiFiles = getAllFiles(apiDir, ['.ts', '.tsx']);
  
  console.log(`Found ${apiFiles.length} API route files\n`);
  
  for (const file of apiFiles) {
    stats.filesProcessed++;
    const replacements = replaceConsoleLogs(file);
    if (replacements > 0) {
      const relativePath = file.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
      console.log(`✅ ${relativePath}: ${replacements} replacements`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Files Processed: ${stats.filesProcessed}`);
  console.log(`Files Modified: ${stats.filesModified}`);
  console.log(`Total Replacements: ${stats.replacements}`);
  console.log(`Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  if (stats.replacements > 0) {
    console.log('\n✅ Console.log statements replaced with logger');
    console.log('💡 Review the changes and test the application');
  } else {
    console.log('\n✅ No console.log statements found (or already replaced)');
  }
}

main().catch(console.error);
