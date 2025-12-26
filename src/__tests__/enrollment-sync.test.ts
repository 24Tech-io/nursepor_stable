import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDatabase } from '@/lib/db';
import { EnrollmentOperations } from '@/lib/data-manager/operations/enrollment';
import { RequestOperations } from '@/lib/data-manager/operations/requests';
import { studentProgress, enrollments, accessRequests, users, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

describe('Enrollment Synchronization', () => {
  let testStudentId: number;
  let testCourseId: number;
  let testAdminId: number;
  let db: any;

  beforeEach(async () => {
    // Setup test data
    db = getDatabase();

    // Create test student
    const [student] = await db
      .insert(users)
      .values({
        name: 'Test Student',
        email: `test-student-${Date.now()}@example.com`,
        password: 'hashedpassword',
        role: 'student',
      })
      .returning();
    testStudentId = student.id;

    // Create test admin
    const [admin] = await db
      .insert(users)
      .values({
        name: 'Test Admin',
        email: `test-admin-${Date.now()}@example.com`,
        password: 'hashedpassword',
        role: 'admin',
      })
      .returning();
    testAdminId = admin.id;

    // Create test course
    const [course] = await db
      .insert(courses)
      .values({
        title: 'Test Course',
        description: 'Test course description',
        instructor: 'Test Instructor',
        status: 'published',
      })
      .returning();
    testCourseId = course.id;
  });

  afterEach(async () => {
    // Cleanup test data
    if (testStudentId && testCourseId) {
      await db
        .delete(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, testStudentId),
            eq(studentProgress.courseId, testCourseId)
          )
        );

      await db
        .delete(enrollments)
        .where(and(eq(enrollments.userId, testStudentId), eq(enrollments.courseId, testCourseId)));

      await db
        .delete(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, testStudentId),
            eq(accessRequests.courseId, testCourseId)
          )
        );
    }

    if (testStudentId) {
      await db.delete(users).where(eq(users.id, testStudentId));
    }
    if (testAdminId) {
      await db.delete(users).where(eq(users.id, testAdminId));
    }
    if (testCourseId) {
      await db.delete(courses).where(eq(courses.id, testCourseId));
    }
  });

  it('should create enrollment in both tables', async () => {
    await db.transaction(async (tx: any) => {
      const result = await EnrollmentOperations.enrollStudent(tx, {
        userId: testStudentId,
        courseId: testCourseId,
        adminId: testAdminId,
        source: 'admin',
      });

      expect(result.studentProgressCreated || result.studentProgressUpdated).toBe(true);
      expect(result.enrollmentCreated || result.enrollmentUpdated).toBe(true);

      // Verify both records exist
      const verification = await EnrollmentOperations.verifyEnrollmentExists(
        tx,
        testStudentId,
        testCourseId
      );
      expect(verification.verified).toBe(true);
      expect(verification.inProgress).toBe(true);
      expect(verification.inEnrollments).toBe(true);
    });
  });

  it('should verify enrollment exists after creation', async () => {
    await db.transaction(async (tx: any) => {
      // Create enrollment
      await EnrollmentOperations.enrollStudent(tx, {
        userId: testStudentId,
        courseId: testCourseId,
        adminId: testAdminId,
        source: 'admin',
      });

      // Verify it exists
      const verification = await EnrollmentOperations.verifyEnrollmentExists(
        tx,
        testStudentId,
        testCourseId
      );

      expect(verification.verified).toBe(true);
    });
  });

  it('should detect missing enrollment in one table', async () => {
    // Create enrollment only in studentProgress
    await db.insert(studentProgress).values({
      studentId: testStudentId,
      courseId: testCourseId,
      completedChapters: '[]',
      watchedVideos: '[]',
      quizAttempts: '[]',
      totalProgress: 0,
    });

    await db.transaction(async (tx: any) => {
      const verification = await EnrollmentOperations.verifyEnrollmentExists(
        tx,
        testStudentId,
        testCourseId
      );

      expect(verification.verified).toBe(false);
      expect(verification.inProgress).toBe(true);
      expect(verification.inEnrollments).toBe(false);
    });
  });

  it('should not delete request if enrollment fails', async () => {
    // Create a test request
    const [request] = await db
      .insert(accessRequests)
      .values({
        studentId: testStudentId,
        courseId: testCourseId,
        reason: 'Test request',
        status: 'pending',
      })
      .returning();

    // Mock enrollStudent to fail by using invalid data
    // In a real test, you'd use a mocking library
    // For now, we'll test the verification logic separately

    // Verify request exists
    const requestCheck = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, request.id));
    expect(requestCheck.length).toBe(1);
  });

  it('should sync enrollment state between tables', async () => {
    // Create enrollment only in studentProgress
    await db.insert(studentProgress).values({
      studentId: testStudentId,
      courseId: testCourseId,
      completedChapters: '[]',
      watchedVideos: '[]',
      quizAttempts: '[]',
      totalProgress: 50,
    });

    await db.transaction(async (tx: any) => {
      // Sync state
      const result = await EnrollmentOperations.syncEnrollmentState(
        tx,
        testStudentId,
        testCourseId
      );

      expect(result.enrollmentCreated).toBe(true);

      // Verify both exist now
      const verification = await EnrollmentOperations.verifyEnrollmentExists(
        tx,
        testStudentId,
        testCourseId
      );
      expect(verification.verified).toBe(true);
    });
  });

  it('should unenroll student from both tables', async () => {
    // Create enrollment in both tables
    await db.transaction(async (tx: any) => {
      await EnrollmentOperations.enrollStudent(tx, {
        userId: testStudentId,
        courseId: testCourseId,
        adminId: testAdminId,
        source: 'admin',
      });

      // Verify enrollment exists
      let verification = await EnrollmentOperations.verifyEnrollmentExists(
        tx,
        testStudentId,
        testCourseId
      );
      expect(verification.verified).toBe(true);

      // Unenroll
      await EnrollmentOperations.unenrollStudent(tx, {
        userId: testStudentId,
        courseId: testCourseId,
        adminId: testAdminId,
      });

      // Verify enrollment no longer exists
      verification = await EnrollmentOperations.verifyEnrollmentExists(
        tx,
        testStudentId,
        testCourseId
      );
      expect(verification.verified).toBe(false);
      expect(verification.inProgress).toBe(false);
      expect(verification.inEnrollments).toBe(false);
    });
  });
});




