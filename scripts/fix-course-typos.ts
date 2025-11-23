import { getDatabase } from '../src/lib/db';
import { courses } from '../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

/**
 * Fix typos in course titles
 */
async function fixCourseTypos() {
  const db = getDatabase();

  try {
    console.log('🔍 Checking for course title typos...');

    // Find courses with "Dharmacology" typo
    const typoCourses = await db
      .select()
      .from(courses)
      .where(like(courses.title, '%Dharmacology%'));

    if (typoCourses.length > 0) {
      console.log(`📝 Found ${typoCourses.length} course(s) with "Dharmacology" typo`);
      
      for (const course of typoCourses) {
        const correctedTitle = course.title.replace('Dharmacology', 'Pharmacology');
        console.log(`  - Fixing: "${course.title}" → "${correctedTitle}"`);
        
        await db
          .update(courses)
          .set({
            title: correctedTitle,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, course.id));
        
        console.log(`  ✅ Fixed course ID ${course.id}`);
      }
    } else {
      console.log('✅ No typos found - all course titles are correct!');
    }

    // Check for other common typos
    const allCourses = await db.select().from(courses);
    console.log('\n📚 All course titles:');
    allCourses.forEach(course => {
      console.log(`  - "${course.title}" (ID: ${course.id})`);
    });

    console.log('\n✅ Course title check complete!');
  } catch (error: any) {
    console.error('❌ Error fixing course typos:', error);
    throw error;
  }
}

// Run if called directly
fixCourseTypos()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

export default fixCourseTypos;

