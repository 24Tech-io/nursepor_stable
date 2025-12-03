import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

(async () => {
    console.log('\n=== AUDIT: Rogue studentProgress entries ===\n');

    const rogue = await sql`
    SELECT sp.id, sp.student_id, sp.course_id, u.name, c.title
    FROM student_progress sp
    JOIN users u ON sp.student_id = u.id
    JOIN courses c ON sp.course_id = c.id
    LEFT JOIN enrollments e ON e.user_id = sp.student_id AND e.course_id = sp.course_id AND e.status = 'active'
    WHERE e.id IS NULL
  `;

    console.log(`Found ${rogue.length} rogue studentProgress entries:`);
    rogue.forEach(r => console.log(`  - ${r.name} → ${r.title} (student_id: ${r.student_id}, course_id: ${r.course_id})`));

    console.log('\n=== AUDIT: Orphan enrollments ===\n');

    const orphan = await sql`
    SELECT e.id, e.user_id, e.course_id, u.name, c.title
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN student_progress sp ON sp.student_id = e.user_id AND sp.course_id = e.course_id
    WHERE e.status = 'active' AND sp.id IS NULL
  `;

    console.log(`Found ${orphan.length} orphan enrollments:`);
    orphan.forEach(o => console.log(`  - ${o.name} → ${o.title} (user_id: ${o.user_id}, course_id: ${o.course_id})`));

    console.log('\n=== AUDIT: Stale requests ===\n');

    const stale = await sql`
    SELECT ar.id, ar.student_id, ar.course_id, ar.status, u.name, c.title,
           CASE WHEN e.id IS NOT NULL THEN true ELSE false END as has_enrollment
    FROM access_requests ar
    JOIN users u ON ar.student_id = u.id
    JOIN courses c ON ar.course_id = c.id
    LEFT JOIN enrollments e ON e.user_id = ar.student_id AND e.course_id = ar.course_id AND e.status = 'active'
    WHERE ar.status IN ('approved', 'rejected') OR (ar.status = 'pending' AND e.id IS NOT NULL)
  `;

    console.log(`Found ${stale.length} stale requests:`);
    stale.forEach(s => console.log(`  - ${s.name} → ${s.title} (status: ${s.status}, has_enrollment: ${s.has_enrollment})`));

    console.log('\n=== SUMMARY ===\n');
    console.log(`Total issues: ${rogue.length + orphan.length + stale.length}`);
    console.log(`  - Rogue studentProgress: ${rogue.length}`);
    console.log(`  - Orphan enrollments: ${orphan.length}`);
    console.log(`  - Stale requests: ${stale.length}`);
    console.log('');

    await sql.end();
})();
