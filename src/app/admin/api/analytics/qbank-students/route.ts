import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { qbankTests, users, qbankQuestionStatistics } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

// GET - Fetch all students' Q-Bank performance
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    // Get all students with Q-Bank activity
    const studentsWithActivity = await db
      .select({
        studentId: users.id,
        studentName: users.name,
        studentEmail: users.email,
        totalTests: sql<number>`COUNT(DISTINCT ${qbankTests.id})`,
        completedTests: sql<number>`COUNT(DISTINCT CASE WHEN ${qbankTests.status} = 'completed' THEN ${qbankTests.id} END)`,
        avgScore: sql<number>`AVG(CASE WHEN ${qbankTests.status} = 'completed' THEN ${qbankTests.percentage} END)`,
        lastTestDate: sql<string>`MAX(${qbankTests.createdAt})`,
      })
      .from(users)
      .leftJoin(qbankTests, eq(users.id, qbankTests.userId))
      .where(eq(users.role, 'student'))
      .groupBy(users.id, users.name, users.email)
      .orderBy(desc(sql`MAX(${qbankTests.createdAt})`));

    // Get question statistics per student
    const studentQuestionStats = await db
      .select({
        userId: qbankQuestionStatistics.userId,
        totalAttempts: sql<number>`SUM(${qbankQuestionStatistics.timesAttempted})`,
        totalCorrect: sql<number>`SUM(${qbankQuestionStatistics.timesCorrect})`,
        totalIncorrect: sql<number>`SUM(${qbankQuestionStatistics.timesIncorrect})`,
        uniqueQuestions: sql<number>`COUNT(DISTINCT ${qbankQuestionStatistics.questionId})`,
      })
      .from(qbankQuestionStatistics)
      .groupBy(qbankQuestionStatistics.userId);

    // Merge data
    const statsMap = new Map();
    studentQuestionStats.forEach((stat) => {
      statsMap.set(stat.userId, stat);
    });

    const studentsData = studentsWithActivity.map((student) => {
      const questionStats = statsMap.get(student.studentId) || {
        totalAttempts: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        uniqueQuestions: 0,
      };

      return {
        id: student.studentId,
        name: student.studentName,
        email: student.studentEmail,
        totalTests: Number(student.totalTests) || 0,
        completedTests: Number(student.completedTests) || 0,
        avgScore: student.avgScore ? Math.round(Number(student.avgScore)) : 0,
        lastTestDate: student.lastTestDate,
        questionsAttempted: Number(questionStats.uniqueQuestions) || 0,
        totalAttempts: Number(questionStats.totalAttempts) || 0,
        totalCorrect: Number(questionStats.totalCorrect) || 0,
        totalIncorrect: Number(questionStats.totalIncorrect) || 0,
        accuracy: questionStats.totalAttempts > 0
          ? Math.round((Number(questionStats.totalCorrect) / Number(questionStats.totalAttempts)) * 100)
          : 0,
      };
    });

    return NextResponse.json({
      students: studentsData,
      totalStudents: studentsData.length,
      activeStudents: studentsData.filter(s => s.totalTests > 0).length,
    });
  } catch (error: any) {
    console.error('Get Q-Bank students analytics error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analytics', error: error.message },
      { status: 500 }
    );
  }
}




