import { getDatabase } from '../lib/db';
import { users, enrollments, courses, accessRequests } from '../lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

async function testStudentAPI() {
  const db = getDatabase();
  const studentId = 6; // The student from the UI

  console.log('\n🔍 Testing Student API for ID:', studentId);
  console.log('═'.repeat(60));

  // Get student info
  const [student] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, 'student')))
    .limit(1);

  if (!student) {
    console.log('❌ Student not found!');
    return;
  }

  console.log('\n📋 Student Info:');
  console.log('  Name:', student.name);
  console.log('  Email:', student.email);
  console.log('  Active:', student.isActive);

  // Get enrollments
  console.log('\n📚 Checking Enrollments:');
  const enrollmentsData = await db
    .select({
      id: enrollments.id,
      courseId: enrollments.courseId,
      userId: enrollments.userId,
      status: enrollments.status,
      progress: enrollments.progress,
      course: {
        id: courses.id,
        title: courses.title,
        status: courses.status,
      },
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.userId, studentId), eq(enrollments.status, 'active')));

  console.log('  Total enrollments found:', enrollmentsData.length);
  enrollmentsData.forEach((e, i) => {
    console.log(
      `  ${i + 1}. Course ID: ${e.courseId}, Title: ${e.course.title}, Status: ${e.status}, Course Status: ${e.course.status}`
    );
  });

  // Filter by course status
  const publishedEnrollments = enrollmentsData.filter(
    (e) =>
      e.course.status === 'published' ||
      e.course.status === 'active' ||
      e.course.status === 'Published' ||
      e.course.status === 'Active'
  );

  console.log('\n  Published/Active enrollments:', publishedEnrollments.length);
  publishedEnrollments.forEach((e, i) => {
    console.log(
      `  ${i + 1}. Course ID: ${e.courseId}, Title: ${e.course.title}, Course Status: ${e.course.status}`
    );
  });

  // Get pending requests
  console.log('\n📝 Checking Pending Requests:');
  const pendingRequests = await db
    .select({
      id: accessRequests.id,
      courseId: accessRequests.courseId,
      status: accessRequests.status,
    })
    .from(accessRequests)
    .where(and(eq(accessRequests.studentId, studentId), eq(accessRequests.status, 'pending')));

  console.log('  Total pending requests:', pendingRequests.length);
  pendingRequests.forEach((r, i) => {
    console.log(`  ${i + 1}. Request ID: ${r.id}, Course ID: ${r.courseId}`);
  });

  // Show final result like API would return
  const pendingRequestCourseIds = new Set(pendingRequests.map((r) => r.courseId.toString()));
  const enrollmentsList = publishedEnrollments
    .filter((e) => !pendingRequestCourseIds.has(e.courseId.toString()))
    .map((e) => ({
      courseId: e.courseId,
      progress: e.progress || 0,
      course: e.course,
    }));

  console.log('\n✅ Final Result (excluding pending requests):');
  console.log('  Enrolled courses count:', enrollmentsList.length);
  enrollmentsList.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.course.title} (ID: ${e.courseId})`);
  });

  console.log('\n═'.repeat(60));
}

testStudentAPI()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
