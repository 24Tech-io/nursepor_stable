import postgres from 'postgres';

const sql = postgres(
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  { ssl: 'require' }
);

(async () => {
  console.log('\n=== Checking course statuses ===\n');

  const courses = await sql`
    SELECT id, title, status FROM courses ORDER BY id
  `;

  courses.forEach((c) => {
    const statusLower = c.status?.toLowerCase();
    const isValid = statusLower === 'published' || statusLower === 'active';
    console.log(`${c.id}. ${c.title}`);
    console.log(`   Status: "${c.status}" (lowercase: "${statusLower}")`);
    console.log(`   Valid for enrollment: ${isValid ? '✅' : '❌'}`);
  });

  console.log('');
  await sql.end();
})();
