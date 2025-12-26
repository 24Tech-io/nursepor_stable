import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getDatabase } from '@/lib/db';
import { certificates, courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch all certificates for the logged-in student
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const db = getDatabase();

    // Fetch all certificates for this student with course details
    const studentCertificates = await db
      .select({
        id: certificates.id,
        userId: certificates.userId,
        courseId: certificates.courseId,
        certificateNumber: certificates.certificateNumber,
        issueDate: certificates.issueDate,
        expiryDate: certificates.expiryDate,
        grade: certificates.grade,
        credentialUrl: certificates.credentialUrl,
        courseName: courses.title,
      })
      .from(certificates)
      .leftJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.userId, user.id));

    return NextResponse.json({
      certificates: studentCertificates.map((cert) => ({
        id: cert.id,
        userId: cert.userId,
        courseId: cert.courseId,
        courseName: cert.courseName || 'Unknown Course',
        certificateNumber: cert.certificateNumber,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        grade: cert.grade,
        credentialUrl: cert.credentialUrl,
      })),
    });
  } catch (error: any) {
    console.error('Get certificates error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch certificates', error: error.message },
      { status: 500 }
    );
  }
}




