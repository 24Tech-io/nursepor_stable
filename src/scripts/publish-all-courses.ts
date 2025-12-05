// Script to publish all courses and make them accessible to students
import { getDatabase } from '../lib/db';
import { courses } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function publishAllCourses() {
  try {
    const db = getDatabase();

    console.log('\n🔍 Fetching all courses...');
    const allCourses = await db.select().from(courses);
    
    console.log(`📚 Found ${allCourses.length} courses\n`);

    if (allCourses.length === 0) {
      console.log('❌ No courses found in database');
      process.exit(0);
    }

    console.log('📋 Current Status:');
    allCourses.forEach((course) => {
      console.log(`   - ${course.title}: status="${course.status}", isPublic=${course.isPublic}, isRequestable=${course.isRequestable}`);
    });

    console.log('\n🔄 Publishing all courses...\n');

    for (const course of allCourses) {
      await db
        .update(courses)
        .set({
          status: 'published',
          isPublic: true,
          isRequestable: true,
        })
        .where(eq(courses.id, course.id));
      
      console.log(`✅ Published: ${course.title}`);
    }

    console.log('\n✅ ALL COURSES PUBLISHED!\n');
    console.log('📋 All courses now:');
    console.log('   • Status: published');
    console.log('   • Public: true (students can enroll directly)');
    console.log('   • Requestable: true (students can request access)');
    console.log('\n🎉 Students can now see and access all courses!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

publishAllCourses();

