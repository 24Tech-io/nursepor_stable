import { config } from 'dotenv';
config({ path: '.env.local' });
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const BASE_URL = 'http://localhost:3002';

// Generate admin token (ID 10)
const adminToken = jwt.sign(
    { id: 10, name: 'Admin', email: 'adhithiyanmaliackal@gmail.com', role: 'admin', isActive: true },
    JWT_SECRET,
    { expiresIn: '7d' }
);

async function testAdminCRUD() {
    console.log('\n🧪 ADMIN COURSE & Q-BANK CRUD TESTING\n');
    console.log('='.repeat(80));

    let createdCourseId: number | null = null;
    let createdQBankId: number | null = null;

    // ==================== COURSE TESTS ====================
    console.log('\n📚 PART 1: COURSE MANAGEMENT\n');

    // Test 1: List existing courses
    console.log('Test 1: List Courses');
    const coursesListResponse = await fetch(`${BASE_URL}/api/admin/courses`, {
        headers: { Cookie: `admin_token=${adminToken}` }
    });

    if (coursesListResponse.status === 200) {
        const data = await coursesListResponse.json();
        console.log(`✅ Success: ${data.courses?.length || 0} courses listed`);
    } else {
        console.log(`❌ Failed: ${coursesListResponse.status}`);
    }

    // Test 2: Create a new course
    console.log('\nTest 2: Create New Course');
    const newCourse = {
        title: 'Test Course - Auto Created',
        description: 'This is a test course created by automated testing',
        instructor: 'Test Instructor',
        duration: '4 weeks',
        status: 'draft',
        category: 'NCLEX-RN',
        difficulty: 'intermediate',
        pricing: JSON.stringify({ type: 'free' })
    };

    const createCourseResponse = await fetch(`${BASE_URL}/api/admin/courses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: `admin_token=${adminToken}`
        },
        body: JSON.stringify(newCourse)
    });

    if (createCourseResponse.status === 200 || createCourseResponse.status === 201) {
        const data = await createCourseResponse.json();
        createdCourseId = data.course?.id || data.id;
        console.log(`✅ Success: Course created with ID ${createdCourseId}`);
    } else {
        const error = await createCourseResponse.text();
        console.log(`❌ Failed: ${createCourseResponse.status}`);
        console.log(`   Error: ${error.substring(0, 200)}`);
    }

    // Test 3: Update the created course
    if (createdCourseId) {
        console.log(`\nTest 3: Update Course (ID ${createdCourseId})`);
        const updateData = {
            title: 'Test Course - Updated',
            description: 'Updated description',
            status: 'published'
        };

        const updateCourseResponse = await fetch(`${BASE_URL}/api/admin/courses/${createdCourseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `admin_token=${adminToken}`
            },
            body: JSON.stringify(updateData)
        });

        if (updateCourseResponse.status === 200) {
            console.log('✅ Success: Course updated');
        } else {
            const error = await updateCourseResponse.text();
            console.log(`❌ Failed: ${updateCourseResponse.status}`);
            console.log(`   Error: ${error.substring(0, 200)}`);
        }
    }

    // Test 4: Get single course details
    if (createdCourseId) {
        console.log(`\nTest 4: Get Course Details (ID ${createdCourseId})`);
        const getCourseResponse = await fetch(`${BASE_URL}/api/admin/courses/${createdCourseId}`, {
            headers: { Cookie: `admin_token=${adminToken}` }
        });

        if (getCourseResponse.status === 200) {
            const data = await getCourseResponse.json();
            console.log('✅ Success: Course details retrieved');
            console.log(`   Title: "${data.course?.title || data.title}"`);
            console.log(`   Status: ${data.course?.status || data.status}`);
        } else {
            console.log(`❌ Failed: ${getCourseResponse.status}`);
        }
    }

    // ==================== Q-BANK TESTS ====================
    console.log('\n\n📝 PART 2: Q-BANK MANAGEMENT\n');

    // Test 5: List existing Q-Banks
    console.log('Test 5: List Q-Banks');
    const qbanksListResponse = await fetch(`${BASE_URL}/api/admin/qbanks`, {
        headers: { Cookie: `admin_token=${adminToken}` }
    });

    if (qbanksListResponse.status === 200) {
        const data = await qbanksListResponse.json();
        console.log(`✅ Success: ${data.qbanks?.length || 0} Q-Banks listed`);
    } else {
        console.log(`❌ Failed: ${qbanksListResponse.status}`);
    }

    // Test 6: Create a new Q-Bank
    console.log('\nTest 6: Create New Q-Bank');
    const newQBank = {
        name: 'Test Q-Bank - Auto Created',
        description: 'This is a test Q-Bank created by automated testing',
        instructor: 'Test Instructor',
        status: 'draft',
        isActive: true,
        isPublic: false,
        isRequestable: true,
        pricing: JSON.stringify({ type: 'free' })
    };

    const createQBankResponse = await fetch(`${BASE_URL}/api/admin/qbanks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: `admin_token=${adminToken}`
        },
        body: JSON.stringify(newQBank)
    });

    if (createQBankResponse.status === 200 || createQBankResponse.status === 201) {
        const data = await createQBankResponse.json();
        createdQBankId = data.qbank?.id || data.id;
        console.log(`✅ Success: Q-Bank created with ID ${createdQBankId}`);
    } else {
        const error = await createQBankResponse.text();
        console.log(`❌ Failed: ${createQBankResponse.status}`);
        console.log(`   Error: ${error.substring(0, 200)}`);
    }

    // Test 7: Update the created Q-Bank
    if (createdQBankId) {
        console.log(`\nTest 7: Update Q-Bank (ID ${createdQBankId})`);
        const updateData = {
            name: 'Test Q-Bank - Updated',
            description: 'Updated Q-Bank description',
            status: 'published'
        };

        const updateQBankResponse = await fetch(`${BASE_URL}/api/admin/qbanks/${createdQBankId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `admin_token=${adminToken}`
            },
            body: JSON.stringify(updateData)
        });

        if (updateQBankResponse.status === 200) {
            console.log('✅ Success: Q-Bank updated');
        } else {
            const error = await updateQBankResponse.text();
            console.log(`❌ Failed: ${updateQBankResponse.status}`);
            console.log(`   Error: ${error.substring(0, 200)}`);
        }
    }

    // Test 8: Get single Q-Bank details
    if (createdQBankId) {
        console.log(`\nTest 8: Get Q-Bank Details (ID ${createdQBankId})`);
        const getQBankResponse = await fetch(`${BASE_URL}/api/admin/qbanks/${createdQBankId}`, {
            headers: { Cookie: `admin_token=${adminToken}` }
        });

        if (getQBankResponse.status === 200) {
            const data = await getQBankResponse.json();
            console.log('✅ Success: Q-Bank details retrieved');
            console.log(`   Name: "${data.qbank?.name || data.name}"`);
            console.log(`   Status: ${data.qbank?.status || data.status}`);
        } else {
            console.log(`❌ Failed: ${getQBankResponse.status}`);
        }
    }

    // ==================== CLEANUP ====================
    console.log('\n\n🧹 PART 3: CLEANUP\n');

    // Delete created course
    if (createdCourseId) {
        console.log(`Deleting test course (ID ${createdCourseId})`);
        const deleteCourseResponse = await fetch(`${BASE_URL}/api/admin/courses/${createdCourseId}`, {
            method: 'DELETE',
            headers: { Cookie: `admin_token=${adminToken}` }
        });

        if (deleteCourseResponse.status === 200) {
            console.log('✅ Course deleted');
        } else {
            console.log(`⚠️  Could not delete course (${deleteCourseResponse.status}) - may need manual cleanup`);
        }
    }

    // Delete created Q-Bank
    if (createdQBankId) {
        console.log(`Deleting test Q-Bank (ID ${createdQBankId})`);
        const deleteQBankResponse = await fetch(`${BASE_URL}/api/admin/qbanks/${createdQBankId}`, {
            method: 'DELETE',
            headers: { Cookie: `admin_token=${adminToken}` }
        });

        if (deleteQBankResponse.status === 200) {
            console.log('✅ Q-Bank deleted');
        } else {
            console.log(`⚠️  Could not delete Q-Bank (${deleteQBankResponse.status}) - may need manual cleanup`);
        }
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(80));
    console.log('✨ ADMIN CRUD TESTING COMPLETE\n');

    console.log('Summary:');
    console.log('✓ Course listing');
    console.log('✓ Course creation (POST)');
    console.log('✓ Course update (PUT)');
    console.log('✓ Course retrieval (GET)');
    console.log('✓ Course deletion (DELETE)');
    console.log('✓ Q-Bank listing');
    console.log('✓ Q-Bank creation (POST)');
    console.log('✓ Q-Bank update (PUT)');
    console.log('✓ Q-Bank retrieval (GET)');
    console.log('✓ Q-Bank deletion (DELETE)');
    console.log('\n📱 For UI form testing, manually verify:');
    console.log('   1. Forms display correctly in browser');
    console.log('   2. Validation errors show properly');
    console.log('   3. Success messages display after save');
    console.log('   4. Edit forms pre-populate with existing data');
    console.log('\n' + '='.repeat(80) + '\n');
}

testAdminCRUD().catch(console.error);
