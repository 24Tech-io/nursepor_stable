import fs from 'fs';
import path from 'path';

function findAndReplaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Replace all instances of "const decoded = await verifyToken(" with "const decoded = verifyToken("
    content = content.replace(/const decoded = await verifyToken\(/g, 'const decoded = verifyToken(');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  let fixedCount = 0;

  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDirectory(fullPath);
      } else if (item.endsWith('.ts')) {
        if (findAndReplaceInFile(fullPath)) {
          fixedCount++;
        }
      }
    }
  }

  walkDirectory(dirPath);
  return fixedCount;
}

console.log('Starting await bug fix...');
const fixedFiles = processDirectory('./src');
console.log(`\nFix completed! ${fixedFiles} files were updated.`);
