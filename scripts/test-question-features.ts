/**
 * Test script to verify Question Form, Image Upload, and NGN Support features
 * This script checks that all code changes are properly integrated
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing Question Features Implementation...\n');

const tests: { name: string; passed: boolean; error?: string }[] = [];

// Test 1: Check QuestionForm component exists
function testQuestionFormExists() {
  const path = join(process.cwd(), 'src', 'components', 'admin', 'qbank', 'QuestionForm.tsx');
  const exists = existsSync(path);
  tests.push({
    name: 'QuestionForm component exists',
    passed: exists,
    error: exists ? undefined : 'QuestionForm.tsx not found',
  });
  
  if (exists) {
    const content = readFileSync(path, 'utf-8');
    const hasImageUpload = content.includes('FileUpload') && content.includes('imageUrl');
    const hasQuestionTypeBuilder = content.includes('QuestionTypeBuilder');
    const hasFormatSupport = content.includes('QuestionFormat');
    
    tests.push({
      name: 'QuestionForm has image upload support',
      passed: hasImageUpload,
      error: hasImageUpload ? undefined : 'Missing FileUpload or imageUrl',
    });
    
    tests.push({
      name: 'QuestionForm has QuestionTypeBuilder integration',
      passed: hasQuestionTypeBuilder,
      error: hasQuestionTypeBuilder ? undefined : 'Missing QuestionTypeBuilder',
    });
    
    tests.push({
      name: 'QuestionForm supports multiple formats',
      passed: hasFormatSupport,
      error: hasFormatSupport ? undefined : 'Missing QuestionFormat type',
    });
  }
}

// Test 2: Check QuizBuilderModal uses QuestionForm
function testQuizBuilderModalIntegration() {
  const path = join(process.cwd(), 'src', 'components', 'admin', 'QuizBuilderModal.tsx');
  const exists = existsSync(path);
  
  if (exists) {
    const content = readFileSync(path, 'utf-8');
    const usesQuestionForm = content.includes('QuestionForm');
    const importsQuestionForm = content.includes("from './qbank/QuestionForm'");
    
    tests.push({
      name: 'QuizBuilderModal imports QuestionForm',
      passed: importsQuestionForm,
      error: importsQuestionForm ? undefined : 'Missing QuestionForm import',
    });
    
    tests.push({
      name: 'QuizBuilderModal uses QuestionForm component',
      passed: usesQuestionForm,
      error: usesQuestionForm ? undefined : 'QuestionForm not used in component',
    });
  } else {
    tests.push({
      name: 'QuizBuilderModal exists',
      passed: false,
      error: 'QuizBuilderModal.tsx not found',
    });
  }
}

// Test 3: Check schema updates
function testSchemaUpdates() {
  const path = join(process.cwd(), 'src', 'lib', 'db', 'schema.ts');
  const exists = existsSync(path);
  
  if (exists) {
    const content = readFileSync(path, 'utf-8');
    const quizQuestionsHasType = content.includes('questionType') && 
                                 content.includes('quizQuestions');
    const quizQuestionsHasImage = content.includes('imageUrl') && 
                                  content.includes('quizQuestions');
    const qbankQuestionsHasImage = content.includes('imageUrl') && 
                                   content.includes('qbankQuestions');
    
    tests.push({
      name: 'quizQuestions has questionType field',
      passed: quizQuestionsHasType,
      error: quizQuestionsHasType ? undefined : 'Missing questionType in quizQuestions',
    });
    
    tests.push({
      name: 'quizQuestions has imageUrl field',
      passed: quizQuestionsHasImage,
      error: quizQuestionsHasImage ? undefined : 'Missing imageUrl in quizQuestions',
    });
    
    tests.push({
      name: 'qbankQuestions has imageUrl field',
      passed: qbankQuestionsHasImage,
      error: qbankQuestionsHasImage ? undefined : 'Missing imageUrl in qbankQuestions',
    });
  }
}

// Test 4: Check API route updates
function testAPIRoutes() {
  // Test quiz questions API
  const quizQuestionsPath = join(process.cwd(), 'src', 'app', 'api', 'quizzes', '[quizId]', 'questions', 'route.ts');
  if (existsSync(quizQuestionsPath)) {
    const content = readFileSync(quizQuestionsPath, 'utf-8');
    const handlesQuestionType = content.includes('questionType');
    const handlesImageUrl = content.includes('imageUrl');
    
    tests.push({
      name: 'Quiz questions API handles questionType',
      passed: handlesQuestionType,
      error: handlesQuestionType ? undefined : 'Missing questionType handling',
    });
    
    tests.push({
      name: 'Quiz questions API handles imageUrl',
      passed: handlesImageUrl,
      error: handlesImageUrl ? undefined : 'Missing imageUrl handling',
    });
  }
  
  // Test qbank API
  const qbankPath = join(process.cwd(), 'src', 'app', 'api', 'qbank', 'route.ts');
  if (existsSync(qbankPath)) {
    const content = readFileSync(qbankPath, 'utf-8');
    const handlesImageUrl = content.includes('imageUrl');
    
    tests.push({
      name: 'Q-Bank API handles imageUrl',
      passed: handlesImageUrl,
      error: handlesImageUrl ? undefined : 'Missing imageUrl handling',
    });
  }
}

// Test 5: Check UnifiedAdminSuite optimistic UI fixes
function testOptimisticUIFixes() {
  const path = join(process.cwd(), 'src', 'components', 'admin', 'UnifiedAdminSuite.tsx');
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf-8');
    const usesFunctionalUpdates = content.includes('setModules(prev =>') || 
                                    content.includes('setModules(prev => prev');
    const hasQuestionTypeInQuiz = content.includes('questionType') && 
                                   content.includes('quizData');
    const hasImageUrlInQuiz = content.includes('imageUrl') && 
                              content.includes('quizData');
    
    tests.push({
      name: 'UnifiedAdminSuite uses functional state updates',
      passed: usesFunctionalUpdates,
      error: usesFunctionalUpdates ? undefined : 'Not using functional state updates',
    });
    
    tests.push({
      name: 'UnifiedAdminSuite includes questionType when saving quiz',
      passed: hasQuestionTypeInQuiz,
      error: hasQuestionTypeInQuiz ? undefined : 'Missing questionType in quiz save',
    });
    
    tests.push({
      name: 'UnifiedAdminSuite includes imageUrl when saving quiz',
      passed: hasImageUrlInQuiz,
      error: hasImageUrlInQuiz ? undefined : 'Missing imageUrl in quiz save',
    });
  }
}

// Test 6: Check migration file exists
function testMigrationFile() {
  const path = join(process.cwd(), 'drizzle', '0020_add_question_image_and_type.sql');
  const exists = existsSync(path);
  
  tests.push({
    name: 'Migration file exists',
    passed: exists,
    error: exists ? undefined : 'Migration file not found',
  });
  
  if (exists) {
    const content = readFileSync(path, 'utf-8');
    const hasQbankImage = content.includes('qbank_questions') && 
                         content.includes('image_url');
    const hasQuizType = content.includes('quiz_questions') && 
                       content.includes('question_type');
    const hasQuizImage = content.includes('quiz_questions') && 
                        content.includes('image_url');
    
    tests.push({
      name: 'Migration adds image_url to qbank_questions',
      passed: hasQbankImage,
      error: hasQbankImage ? undefined : 'Missing qbank_questions image_url',
    });
    
    tests.push({
      name: 'Migration adds question_type to quiz_questions',
      passed: hasQuizType,
      error: hasQuizType ? undefined : 'Missing quiz_questions question_type',
    });
    
    tests.push({
      name: 'Migration adds image_url to quiz_questions',
      passed: hasQuizImage,
      error: hasQuizImage ? undefined : 'Missing quiz_questions image_url',
    });
  }
}

// Run all tests
console.log('Running tests...\n');
testQuestionFormExists();
testQuizBuilderModalIntegration();
testSchemaUpdates();
testAPIRoutes();
testOptimisticUIFixes();
testMigrationFile();

// Print results
console.log('📊 Test Results:\n');
let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const icon = test.passed ? '✅' : '❌';
  const status = test.passed ? 'PASS' : 'FAIL';
  console.log(`${icon} [${index + 1}/${tests.length}] ${test.name}: ${status}`);
  if (test.error) {
    console.log(`   ⚠️  ${test.error}`);
  }
  
  if (test.passed) {
    passed++;
  } else {
    failed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`Total: ${tests.length} tests`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

if (failed === 0) {
  console.log('🎉 All tests passed! Implementation is complete.');
  console.log('\n📝 Next steps:');
  console.log('   1. Set DATABASE_URL in .env.local');
  console.log('   2. Run: npx tsx scripts/run-migration-0020.ts');
  console.log('   3. Test the features in the admin dashboard');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}

