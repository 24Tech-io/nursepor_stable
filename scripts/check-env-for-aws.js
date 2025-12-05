import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking .env.local for AWS Amplify configuration...\n');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.log('\n📝 Creating a new JWT_SECRET for you...');
  const newSecret = crypto.randomBytes(32).toString('hex');
  console.log('\n✅ Generated JWT_SECRET (64 characters):');
  console.log(`JWT_SECRET=${newSecret}\n`);
  console.log('📋 Copy this value and add it to AWS Amplify Console → Environment Variables');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let jwtSecret = null;
let databaseUrl = null;
let appUrl = null;

lines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('JWT_SECRET=')) {
    jwtSecret = trimmed.split('=')[1]?.trim();
  } else if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.split('=')[1]?.trim();
  } else if (trimmed.startsWith('NEXT_PUBLIC_APP_URL=')) {
    appUrl = trimmed.split('=')[1]?.trim();
  }
});

console.log('📋 AWS Amplify Environment Variables Configuration:\n');
console.log('═'.repeat(60));

// JWT_SECRET
if (jwtSecret) {
  const length = jwtSecret.length;
  const masked = jwtSecret.length > 8 
    ? `${jwtSecret.substring(0, 4)}...${jwtSecret.substring(length - 4)}`
    : '***';
  
  console.log('\n1. JWT_SECRET:');
  if (length >= 32) {
    console.log(`   ✅ Valid (${length} characters)`);
    console.log(`   Preview: ${masked}`);
    console.log(`   \n   📋 FULL VALUE (copy this for AWS):`);
    console.log(`   ${jwtSecret}`);
  } else {
    console.log(`   ⚠️  Too short (${length} characters, need 32+)`);
    console.log('   Generating new one...');
    const newSecret = crypto.randomBytes(32).toString('hex');
    console.log(`   \n   📋 NEW JWT_SECRET (copy this for AWS):`);
    console.log(`   ${newSecret}`);
  }
} else {
  console.log('\n1. JWT_SECRET:');
  console.log('   ❌ Not found in .env.local');
  console.log('   Generating new one...');
  const newSecret = crypto.randomBytes(32).toString('hex');
  console.log(`   \n   📋 NEW JWT_SECRET (copy this for AWS):`);
  console.log(`   ${newSecret}`);
}

// DATABASE_URL
console.log('\n2. DATABASE_URL:');
if (databaseUrl) {
  console.log('   ✅ Found');
  const preview = databaseUrl.length > 50 
    ? `${databaseUrl.substring(0, 50)}...`
    : databaseUrl;
  console.log(`   Preview: ${preview}`);
  console.log(`   \n   📋 FULL VALUE (copy this for AWS):`);
  console.log(`   ${databaseUrl}`);
} else {
  console.log('   ⚠️  Not found (will need to set in AWS)');
  console.log('   Use your Neon Postgres connection string');
}

// NEXT_PUBLIC_APP_URL
console.log('\n3. NEXT_PUBLIC_APP_URL:');
if (appUrl) {
  console.log(`   ✅ Found in .env.local: ${appUrl}`);
}
console.log('   ⚠️  For AWS, use this value:');
console.log('   https://main.d37ba296v07j95.amplifyapp.com');

console.log('\n4. NODE_ENV:');
console.log('   📋 For AWS, use: production');

console.log('\n' + '═'.repeat(60));
console.log('\n📝 SUMMARY - Copy these to AWS Amplify Console:\n');
console.log('─'.repeat(60));
console.log('\nVariable Name: JWT_SECRET');
if (jwtSecret && jwtSecret.length >= 32) {
  console.log(`Value: ${jwtSecret}`);
} else {
  const newSecret = crypto.randomBytes(32).toString('hex');
  console.log(`Value: ${newSecret}`);
}
console.log('\nVariable Name: DATABASE_URL');
if (databaseUrl) {
  console.log(`Value: ${databaseUrl}`);
} else {
  console.log('Value: [YOUR_DATABASE_URL_HERE]');
}
console.log('\nVariable Name: NEXT_PUBLIC_APP_URL');
console.log('Value: https://main.d37ba296v07j95.amplifyapp.com');
console.log('\nVariable Name: NODE_ENV');
console.log('Value: production');
console.log('\n' + '─'.repeat(60));
console.log('\n✅ Done! Add these in AWS Amplify Console → Environment Variables');
console.log('   Then redeploy your app.\n');

