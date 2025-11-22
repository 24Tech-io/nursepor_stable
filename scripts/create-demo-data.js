import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple script to call the API endpoint
// You need to be logged in as admin first
console.log('📋 This script will create demo Q-Bank data via the API endpoint.');
console.log('⚠️  Make sure you are logged in as admin first!\n');
console.log('💡 Alternatively, you can:');
console.log('   1. Go to /admin/courses');
console.log('   2. Click "Create Demo Q-Bank Data" button\n');
console.log('🔗 Or use this curl command (replace YOUR_TOKEN with your admin session token):');
console.log('   curl -X POST http://localhost:3000/api/setup/demo-qbank-data \\');
console.log('     -H "Cookie: token=YOUR_TOKEN" \\');
console.log('     -H "Content-Type: application/json"\n');

process.exit(0);

