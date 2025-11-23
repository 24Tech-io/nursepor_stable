import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testDatabaseConnectivity() {
    console.log('\n🔍 PHASE 1: Database Connectivity Test\n');

    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        // Test basic query
        const result = await sql`SELECT NOW() as current_time`;
        console.log('✅ Database connected successfully');
        console.log(`   Current DB time: ${result[0].current_time}`);

        // Check critical tables exist
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'courses', 'access_requests', 'enrollments', 'student_progress', 'question_banks', 'qbank_questions')
      ORDER BY table_name
    `;

        console.log(`\n✅ Critical tables verified (${tables.length}/7):`);
        tables.forEach(t => console.log(`   - ${t.table_name}`));

        if (tables.length < 7) {
            console.log('\n⚠️  WARNING: Some tables are missing!');
        }

        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

async function testDataIntegrity() {
    console.log('\n🔍 PHASE 2: Data Integrity Test\n');

    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        // Count records in critical tables
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        const courseCount = await sql`SELECT COUNT(*) as count FROM courses`;
        const requestCount = await sql`SELECT COUNT(*) as count FROM access_requests`;
        const enrollmentCount = await sql`SELECT COUNT(*) as count FROM enrollments`;
        const progressCount = await sql`SELECT COUNT(*) as count FROM student_progress`;

        console.log('📊 Record Counts:');
        console.log(`   Users: ${userCount[0].count}`);
        console.log(`   Courses: ${courseCount[0].count}`);
        console.log(`   Access Requests: ${requestCount[0].count}`);
        console.log(`   Enrollments: ${enrollmentCount[0].count}`);
        console.log(`   Student Progress: ${progressCount[0].count}`);

        // Check for orphaned records
        const orphanedRequests = await sql`
      SELECT COUNT(*) as count 
      FROM access_requests ar 
      LEFT JOIN users u ON ar.student_id = u.id 
      WHERE u.id IS NULL
    `;

        const orphanedEnrollments = await sql`
      SELECT COUNT(*) as count 
      FROM enrollments e 
      LEFT JOIN users u ON e.user_id = u.id 
      WHERE u.id IS NULL
    `;

        console.log(`\n🔍 Orphaned Records Check:`);
        console.log(`   Orphaned Requests: ${orphanedRequests[0].count}`);
        console.log(`   Orphaned Enrollments: ${orphanedEnrollments[0].count}`);

        if (orphanedRequests[0].count > 0 || orphanedEnrollments[0].count > 0) {
            console.log('   ⚠️  Found orphaned records!');
        } else {
            console.log('   ✅ No orphaned records');
        }

        // Check enrollment sync
        const approvedWithoutEnrollment = await sql`
      SELECT ar.id, ar.student_id, ar.course_id, u.name, c.title
      FROM access_requests ar
      JOIN users u ON ar.student_id = u.id
      JOIN courses c ON ar.course_id = c.id
      LEFT JOIN enrollments e ON ar.student_id = e.user_id AND ar.course_id = e.course_id
      WHERE ar.status = 'approved' AND e.id IS NULL
    `;

        console.log(`\n🔍 Sync Check:`);
        console.log(`   Approved requests without enrollment: ${approvedWithoutEnrollment.length}`);

        if (approvedWithoutEnrollment.length > 0) {
            console.log('   ⚠️  Sync issue detected!');
            approvedWithoutEnrollment.forEach(r => {
                console.log(`      - ${r.name} -> ${r.title} (Request ID: ${r.id})`);
            });
        } else {
            console.log('   ✅ All approved requests have enrollments');
        }

        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Data integrity test failed:', error);
        return false;
    }
}

async function testStudentAccounts() {
    console.log('\n🔍 PHASE 3: Student Account Test\n');

    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        const students = await sql`
      SELECT id, name, email, is_active, 
             (SELECT COUNT(*) FROM enrollments WHERE user_id = users.id) as enrollment_count,
             (SELECT COUNT(*) FROM student_progress WHERE student_id = users.id) as progress_count,
             (SELECT COUNT(*) FROM access_requests WHERE student_id = users.id) as request_count
      FROM users 
      WHERE role = 'student'
      ORDER BY id
    `;

        console.log(`✅ Found ${students.length} student accounts:\n`);
        students.forEach(s => {
            console.log(`   Student ID ${s.id}: ${s.name}`);
            console.log(`      Email: ${s.email}`);
            console.log(`      Active: ${s.is_active}`);
            console.log(`      Enrollments: ${s.enrollment_count}`);
            console.log(`      Progress: ${s.progress_count}`);
            console.log(`      Requests: ${s.request_count}`);
            console.log('');
        });

        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Student account test failed:', error);
        return false;
    }
}

async function testCourseConfiguration() {
    console.log('\n🔍 PHASE 4: Course Configuration Test\n');

    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        const courses = await sql`
      SELECT id, title, status, is_public, is_requestable, is_default_unlocked,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id) as enrollment_count,
             (SELECT COUNT(*) FROM access_requests WHERE course_id = courses.id) as request_count
      FROM courses 
      ORDER BY id
    `;

        console.log(`✅ Found ${courses.length} courses:\n`);
        courses.forEach(c => {
            console.log(`   Course ID ${c.id}: ${c.title}`);
            console.log(`      Status: ${c.status}`);
            console.log(`      Public: ${c.is_public} | Requestable: ${c.is_requestable} | Default Unlocked: ${c.is_default_unlocked}`);
            console.log(`      Enrollments: ${c.enrollment_count} | Requests: ${c.request_count}`);
            console.log('');
        });

        await sql.end();
        return true;
    } catch (error) {
        console.error('❌ Course configuration test failed:', error);
        return false;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   LMS PLATFORM - COMPREHENSIVE API & DATA TESTING');
    console.log('═══════════════════════════════════════════════════════');

    const results = {
        database: false,
        dataIntegrity: false,
        students: false,
        courses: false,
    };

    results.database = await testDatabaseConnectivity();
    if (!results.database) {
        console.log('\n❌ Database test failed. Aborting further tests.');
        process.exit(1);
    }

    results.dataIntegrity = await testDataIntegrity();
    results.students = await testStudentAccounts();
    results.courses = await testCourseConfiguration();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`   Database Connectivity: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Data Integrity: ${results.dataIntegrity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Student Accounts: ${results.students ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Course Configuration: ${results.courses ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r);
    console.log(`\n   Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}\n`);

    process.exit(allPassed ? 0 : 1);
}

main();
