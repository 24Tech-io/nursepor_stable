// Script to apply performance indexes to database
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

async function applyIndexes() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    });

    console.log('Connecting to database...');

    try {
        const client = await pool.connect();
        console.log('Connected! Applying performance indexes...\n');

        // Read the SQL file
        const sql = fs.readFileSync('./drizzle/0026_ultra_fast_performance_indexes.sql', 'utf8');

        // Split into individual statements and execute each
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            if (!statement || statement.startsWith('--')) continue;

            try {
                await client.query(statement);
                successCount++;
                // Extract index name for logging
                const match = statement.match(/(?:CREATE INDEX|ANALYZE)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
                const name = match ? match[1] : 'statement';
                console.log(`✅ Applied: ${name}`);
            } catch (err) {
                if (err.code === '42P07') {
                    // Already exists, skip
                    skipCount++;
                    const match = statement.match(/(?:CREATE INDEX)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
                    console.log(`⏭️  Skipped (exists): ${match ? match[1] : 'index'}`);
                } else {
                    errorCount++;
                    console.log(`❌ Error: ${err.message}`);
                }
            }
        }

        client.release();

        console.log('\n========================================');
        console.log(`Performance indexes applied!`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`⏭️  Skipped: ${skipCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('========================================');

    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await pool.end();
    }
}

applyIndexes();
