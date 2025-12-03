import postgres from 'postgres';

const sql = postgres(
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  { ssl: 'require' }
);

(async () => {
  const sp = await sql`
    SELECT sp.id, sp.course_id, sp.total_progress, c.title
    FROM student_progress sp
    JOIN courses c ON sp.course_id = c.id
    WHERE sp.student_id = 6
  `;

  const e = await sql`
    SELECT e.id, e.course_id, e.progress, c.title
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = 6
  `;

  console.log('\nstudentProgress table:', sp.length, 'records');
  sp.forEach((c) =>
    console.log('  -', c.title, '(ID:', c.course_id + ', Progress:', c.total_progress + '%)')
  );

  console.log('\nenrollments table:', e.length, 'records');
  e.forEach((c) =>
    console.log('  -', c.title, '(ID:', c.course_id + ', Progress:', c.progress + '%)')
  );

  console.log('\n');
  await sql.end();
})();
