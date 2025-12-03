import postgres from 'postgres';

const sql = postgres(
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  { ssl: 'require' }
);

(async () => {
  const studentId = 6;
  const courseId = 10; // Pharmacology Essentials

  console.log('\n=== Checking student 6 + Pharmacology Essentials ===\n');

  // Check enrollments
  const enrollment = await sql`
    SELECT * FROM enrollments 
    WHERE user_id = ${studentId} AND course_id = ${courseId}
  `;
  console.log(
    `Enrollment: ${enrollment.length > 0 ? 'EXISTS (id: ' + enrollment[0].id + ', status: ' + enrollment[0].status + ')' : 'NOT FOUND'}`
  );

  // Check studentProgress
  const progress = await sql`
    SELECT * FROM student_progress 
    WHERE student_id = ${studentId} AND course_id = ${courseId}
  `;
  console.log(
    `studentProgress: ${progress.length > 0 ? 'EXISTS (id: ' + progress[0].id + ')' : 'NOT FOUND'}`
  );

  // Check access_requests
  const requests = await sql`
    SELECT * FROM access_requests 
    WHERE student_id = ${studentId} AND course_id = ${courseId}
    ORDER BY requested_at DESC
  `;
  console.log(`access_requests: ${requests.length} found`);
  requests.forEach((r) => {
    console.log(`  - ID: ${r.id}, Status: ${r.status}, Requested: ${r.requested_at}`);
  });

  console.log('\nConclusion:');
  if (enrollment.length > 0 || progress.length > 0) {
    console.log('  ✅ Student IS enrolled → Cannot request');
  } else if (requests.length > 0) {
    console.log(`  ⚠️  Student has ${requests.length} request(s) → Cannot request again`);
    console.log(`  → Need to DELETE these requests to allow new request`);
  } else {
    console.log('  ✅ Student can request this course');
  }
  console.log('');

  await sql.end();
})();
