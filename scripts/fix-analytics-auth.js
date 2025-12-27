const fs = require('fs');
const path = require('path');

const analyticsDir = 'c:\\Users\\adhit\\Desktop\\lms-platform\\src\\app\\api\\student\\qbanks\\[id]\\analytics';

const files = [
    'subject-performance',
    'client-needs',
    'readiness',
    'recommendations',
    'remediation',
    'strengths-weaknesses',
    'system-performance',
    'test-history',
    'trends'
];

files.forEach(file => {
    const filePath = path.join(analyticsDir, file, 'route.ts');

    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace import
        content = content.replace(
            "import { verifyToken } from '@/lib/auth';",
            "import { verifyAuth } from '@/lib/auth';"
        );

        // Replace auth logic - pattern for the token verification block
        const oldAuthPattern = /const token = request\.cookies\.get\('student_token'\)\?\.value \|\| request\.cookies\.get\('token'\)\?\.value;[\s\S]*?const studentId = decoded\.id;/;

        const newAuth = `const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const studentId = auth.user.id;`;

        content = content.replace(oldAuthPattern, newAuth);

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${file}/route.ts`);
    } else {
        console.log(`❌ Not found: ${file}/route.ts`);
    }
});

console.log('\n✨ All analytics endpoints updated!');
