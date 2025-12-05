import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getDatabase } from '@/lib/db';
import { certificates, courses, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Download certificate as PDF (simple text-based for now)
export async function GET(
  request: NextRequest,
  { params }: { params: { certId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const certId = parseInt(params.certId);
    const db = getDatabase();

    // Fetch certificate with course and user details
    const cert = await db
      .select({
        certificate: certificates,
        courseName: courses.title,
        userName: users.name,
      })
      .from(certificates)
      .leftJoin(courses, eq(certificates.courseId, courses.id))
      .leftJoin(users, eq(certificates.userId, users.id))
      .where(and(eq(certificates.id, certId), eq(certificates.userId, user.id)))
      .limit(1);

    if (cert.length === 0) {
      return NextResponse.json({ message: 'Certificate not found' }, { status: 404 });
    }

    const certData = cert[0];

    // Generate simple text-based certificate (in production, use PDF library)
    const certificateText = `
═══════════════════════════════════════════════════════════════
                     CERTIFICATE OF COMPLETION
═══════════════════════════════════════════════════════════════

                        This certifies that

                    ${certData.userName || 'Student'}

                     has successfully completed

                      ${certData.courseName}

═══════════════════════════════════════════════════════════════

Certificate Number: ${certData.certificate.certificateNumber}
Issue Date: ${new Date(certData.certificate.issueDate).toLocaleDateString()}
${certData.certificate.grade ? `Grade: ${certData.certificate.grade}` : ''}

═══════════════════════════════════════════════════════════════
                      Nurse Pro Academy
═══════════════════════════════════════════════════════════════
`;

    // Return as downloadable text file (in production, generate PDF)
    return new NextResponse(certificateText, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="certificate-${certData.certificate.certificateNumber}.txt"`,
      },
    });
  } catch (error: any) {
    console.error('Download certificate error:', error);
    return NextResponse.json(
      { message: 'Failed to download certificate', error: error.message },
      { status: 500 }
    );
  }
}



