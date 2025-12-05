#!/usr/bin/env tsx
/**
 * Add missing columns to enrollments table
 * Run with: npx tsx scripts/add-enrollments-columns.ts
 */

import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

async function addEnrollmentsColumns() {
  console.log('🔧 Adding missing columns to enrollments table...\n');

  try {
    // Dynamic import to ensure env var is set before db init
    const { db } = await import('../src/lib/db/index.js');

    // Check if columns exist
    const checkColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'enrollments' 
      AND column_name IN ('updated_at', 'completed_at')
    `);

    console.log('📊 Current columns:', checkColumns.rows);

    // Add updated_at column if it doesn't exist
    try {
      await db.execute(sql`
        ALTER TABLE enrollments 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      `);
      console.log('✅ Added updated_at column');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  updated_at column already exists');
      } else {
        throw error;
      }
    }

    // Add completed_at column if it doesn't exist
    try {
      await db.execute(sql`
        ALTER TABLE enrollments 
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
      `);
      console.log('✅ Added completed_at column');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  completed_at column already exists');
      } else {
        throw error;
      }
    }

    // Create indexes for better performance
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_enrollments_updated_at 
        ON enrollments(updated_at)
      `);
      console.log('✅ Created index on updated_at');
    } catch (error: any) {
      console.log('ℹ️  Index on updated_at already exists or error:', error.message);
    }

    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_enrollments_completed_at 
        ON enrollments(completed_at) 
        WHERE completed_at IS NOT NULL
      `);
      console.log('✅ Created index on completed_at');
    } catch (error: any) {
      console.log('ℹ️  Index on completed_at already exists or error:', error.message);
    }

    // Update existing records
    const updateResult = await db.execute(sql`
      UPDATE enrollments 
      SET updated_at = enrolled_at 
      WHERE updated_at IS NULL OR updated_at < enrolled_at
    `);
    console.log(`✅ Updated ${updateResult.rowCount || 0} existing records`);

    // Verify columns were added
    const verifyColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'enrollments' 
      AND column_name IN ('updated_at', 'completed_at')
      ORDER BY column_name
    `);

    console.log('\n📊 Verification - Columns in enrollments table:');
    verifyColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addEnrollmentsColumns();


