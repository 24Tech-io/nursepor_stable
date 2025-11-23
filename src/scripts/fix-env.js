const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const correctURL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

try {
    let content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    let found = false;
    const newLines = lines.map(line => {
        if (line.startsWith('DATABASE_URL=')) {
            found = true;
            console.log('Found existing DATABASE_URL');
            return `DATABASE_URL=${correctURL}`;
        }
        return line;
    });

    if (!found) {
        console.log('DATABASE_URL not found, adding it');
        newLines.push(`DATABASE_URL=${correctURL}`);
    }

    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('✅ Updated .env.local with correct DATABASE_URL');
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
