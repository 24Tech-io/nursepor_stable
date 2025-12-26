import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const listTablesSql =
    "select table_name from information_schema.tables where table_schema='public' order by table_name";
  const listColsSql = (table: string) =>
    `select column_name from information_schema.columns where table_schema='public' and table_name='${table}' order by ordinal_position`;

  try {
    const tables = (await pool.query(listTablesSql)).rows.map((r) => r.table_name);
    const has = (t: string) => tables.includes(t);

    console.log('✅ Connected');
    console.log('DB:', (process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0]);
    console.log('tables:', {
      notifications: has('notifications'),
      enrollments: has('enrollments'),
      qbank_access_requests: has('qbank_access_requests'),
    });

    for (const t of ['enrollments', 'qbank_access_requests', 'notifications'] as const) {
      if (!has(t)) continue;
      const cols = (await pool.query(listColsSql(t))).rows.map((r) => r.column_name);
      console.log(`${t} columns:`, cols);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ inspect failed', e);
  process.exit(1);
});




