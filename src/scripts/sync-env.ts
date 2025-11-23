
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load root .env.local
const rootEnvPath = path.join(process.cwd(), '.env.local');
const adminEnvPath = path.join(process.cwd(), 'admin-app', '.env');

console.log(`Reading from: ${rootEnvPath}`);
const rootConfig = dotenv.parse(fs.readFileSync(rootEnvPath));

if (rootConfig.DATABASE_URL) {
    console.log('Found DATABASE_URL in root .env.local');

    // Prepare content for admin-app/.env
    const adminEnvContent = `DATABASE_URL="${rootConfig.DATABASE_URL}"\n`;

    // Write to admin-app/.env
    console.log(`Writing to: ${adminEnvPath}`);
    fs.writeFileSync(adminEnvPath, adminEnvContent);
    console.log('✅ Successfully synced DATABASE_URL to admin-app/.env');
} else {
    console.error('❌ DATABASE_URL not found in root .env.local');
}
