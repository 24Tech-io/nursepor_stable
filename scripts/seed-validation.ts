
import 'dotenv/config';
import { db } from '@/lib/db';
import { questionBanks, qbankQuestions, qbankCategories, qbankTests, qbankEnrollments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Seeding Validation Q-Bank...');

    // 1. Create Validation Q-Bank
    const [bank] = await db.insert(questionBanks).values({
        name: 'MASTER VALIDATION QBANK',
        description: 'Contains one of every supported question type (Classic & NGN).',
        isActive: true,
    }).returning();

    console.log('Created Bank:', bank.id);

    // 2. Create Subject/Category
    const [category] = await db.insert(qbankCategories).values({
        questionBankId: bank.id,
        name: 'Validation Tests',
    }).returning();

    // 3. Insert Questions (12 Types)

    const questions = [
        // 1. Multiple Choice (Classic)
        {
            questionType: 'multiple_choice',
            question: 'Which vital sign is most indicative of increased intracranial pressure (Cushing\'s Triad)?',
            options: JSON.stringify(['Tachycardia', 'Hypotension', 'Bradypnea', 'Widened Pulse Pressure']),
            correctAnswer: 3, // Index 3 => Widened Pulse Pressure (and Bradycardia/Irregular Resp)
            explanation: 'Cushing\'s Triad consists of hypertension with widened pulse pressure, bradycardia, and irregular respirations.',
        },
        // 2. SATA (Classic)
        {
            questionType: 'sata',
            question: 'Which of the following are symptoms of hypoglycemia? (Select all that apply)',
            options: JSON.stringify(['Diaphoresis', 'Bradycardia', 'Confusion', 'Tremors', 'Polyuria']),
            correctAnswer: JSON.stringify([0, 2, 3]), // Diaphoresis, Confusion, Tremors
            explanation: 'Signs of hypoglycemia include diaphoresis, confusion, tremors, tachycardia, and hunger.',
        },
        // 3. Ordered Response / Ranking (Classic)
        {
            questionType: 'ranking',
            question: 'Arrange the steps of inserting an indwelling urinary catheter in the correct order.',
            options: JSON.stringify([
                'Perform hand hygiene',
                'Position the patient',
                'Open sterile kit',
                'Don sterile gloves',
                'Cleanse the meatus'
            ]),
            correctAnswer: JSON.stringify([0, 1, 2, 3, 4]), // Indices in correct order
            explanation: 'Standard aseptic technique order.',
        },
        // 4. Dosage Calculation (Classic/NGN)
        {
            questionType: 'dosage_calculation',
            question: 'Order: Digoxin 0.125 mg PO daily. Available: Digoxin 0.25 mg tablets. How many tablets will you administer?',
            options: JSON.stringify({
                unit: 'tablets',
                correctValue: 0.5,
                tolerance: 0,
                decimalPlaces: 1
            }),
            correctAnswer: '0.5',
            explanation: '0.125 / 0.25 = 0.5 tablets.',
        },
        // 5. Highlight Text (NGN)
        {
            questionType: 'highlight_text',
            question: 'Highlight the findings that require immediate follow-up.',
            options: JSON.stringify({
                text: "The patient is a [56-year-old male] who presents with [chest pain]. BP is [88/50], HR is [120], and skin is [cool and clammy]. He reports [nausea].",
                tokens: [
                    { id: 0, text: "56-year-old male", correct: false },
                    { id: 1, text: "chest pain", correct: true },
                    { id: 2, text: "88/50", correct: true },
                    { id: 3, text: "120", correct: true },
                    { id: 4, text: "cool and clammy", correct: true },
                    { id: 5, text: "nausea", correct: false }
                    // Nausea is concerning but signs of shock (BP, HR, Skin) are priority.
                ]
            }),
            correctAnswer: JSON.stringify([1, 2, 3, 4]),
            explanation: 'Hypotension, Tachycardia, and Cool/Clammy skin with Chest Pain indicate cardiogenic shock.',
        },
        // 6. Extended Drag & Drop (NGN)
        {
            questionType: 'extended_drag_drop',
            question: 'Match the insulin type to its onset of action.',
            options: JSON.stringify({
                items: ['Lispro', 'Regular', 'NPH', 'Glargine'],
                categories: ['15-30 mins', '30-60 mins', '1-2 hours', 'No Peak / 70 mins'],
                correctMapping: { 0: 0, 1: 1, 2: 2, 3: 3 } // Simple 1-to-1 mapping for demo
            }),
            correctAnswer: JSON.stringify({ 0: 0, 1: 1, 2: 2, 3: 3 }),
            explanation: 'Lispro is rapid (15m), Regular is short (30m), NPH is intermediate (1-2h onset), Glargine is long acting.',
        },
        // 7. Cloze Dropdown (NGN)
        {
            questionType: 'cloze_dropdown',
            question: 'Complete the sentence regarding ABG interpretation.',
            options: JSON.stringify({
                text: "A pH of 7.25 indicates [DROPDOWN]. A PaCO2 of 60 mmHg indicates [DROPDOWN]. This is likely [DROPDOWN].",
                dropdowns: [
                    { options: ['Acidosis', 'Alkalosis', 'Normal'], correct: 0 }, // Acidosis
                    { options: ['Respiratory component', 'Metabolic component', 'Normal'], correct: 0 }, // Respiratory (High CO2)
                    { options: ['Respiratory Acidosis', 'Metabolic Acidosis', 'Respiratory Alkalosis'], correct: 0 } // Resp Acidosis
                ]
            }),
            correctAnswer: JSON.stringify({ 0: 0, 1: 0, 2: 0 }),
            explanation: 'Low pH = Acidosis. High CO2 = Respiratory cause.',
        },
        // 8. Matrix / Grid (NGN)
        {
            questionType: 'matrix_multiple_response',
            question: 'For each assessment finding, select if it is consistent with Hypothyroidism or Hyperthyroidism.',
            options: JSON.stringify({
                rows: ['Weight Loss', 'Cold Intolerance', 'Bradycardia', 'Heat Intolerance'],
                columns: ['Hypothyroidism', 'Hyperthyroidism'],
                responses: {}
            }),
            correctAnswer: JSON.stringify({
                "0-1": true, // Weight Loss -> Hyper
                "1-0": true, // Cold Intol -> Hypo
                "2-0": true, // Bradycardia -> Hypo
                "3-1": true  // Heat Intol -> Hyper
            }),
            explanation: 'Hyperthyroidism increases metabolic rate (weight loss, heat). Hypothyroidism decreases it (cold, bradycardia).',
        },
        // 9. Trend Item (NGN)
        {
            questionType: 'trend_item',
            question: 'Based on the trend data above, what is the priority action at 12:00?',
            options: JSON.stringify({
                trendTabs: {
                    vitals: [
                        { time: '08:00', HR: 80, BP: '120/80', Temp: 37.0 },
                        { time: '10:00', HR: 95, BP: '110/70', Temp: 37.5 },
                        { time: '12:00', HR: 120, BP: '90/60', Temp: 38.5 }
                    ],
                    notes: { "12:00": "Patient shivering, reports feeling cold." },
                    labs: {}, intakeOutput: {}, mar: {}, imaging: {}
                },
                question: 'Based on the trend data above, what is the priority action at 12:00?',
                options: [
                    { id: 0, text: 'Administer acetaminophen' },
                    { id: 1, text: 'Start IV fluid bolus' },
                    { id: 2, text: 'Cover with warm blankets' },
                    { id: 3, text: 'Obtain blood cultures' }
                ]
            }),
            correctAnswer: 1, // Start IV fluids (Sepsis/Hypotension Priority)
            explanation: 'Trends show tachycardia, hypotension, and fever indicating possible sepsis. Fluid resuscitation is priority for hypotension.',
        },
        // 10. Bow-Tie (NGN)
        {
            questionType: 'bowtie',
            question: 'Complete the diagram by dragging the choices to the appropriate targets.',
            options: JSON.stringify({
                // POOLS of options (Student sees these + distractors)
                assessmentFindings: ['Chest Pain', 'Dyspnea', 'Fever', 'Edema', 'Rash', 'Headache'],
                condition: ['Myocardial Infarction', 'Pneumonia', 'Heart Failure', 'Gastroenteritis'],
                nursingActions: ['Administer Nitroglycerin', 'Start Antibiotics', 'Administer Diuretics', 'Elevate Legs', 'Apply Ice', 'Administer Antipyretics'],

                // Note: The UI separates Pools (Left/Center/Right)
            }),
            // Correct Answer definition for validation
            correctAnswer: JSON.stringify({
                findings: ['Chest Pain', 'Dyspnea'],
                condition: 'Myocardial Infarction',
                actions: ['Administer Nitroglycerin', 'Elevate Legs']
            }),
            explanation: 'Classic MI presentation and management. Fever/Rash/Headache are distractors.',
        },
        // 11. Case Study (NGN)
        {
            questionType: 'ngn_case_study',
            question: '6-Step Case Study',
            options: JSON.stringify({
                title: 'Case Study: Mr. Jones',
                description: 'Mr. Jones is a 65yo male admitted with shortness of breath...',
                steps: {
                    1: { question: 'Recognize Cues: Which findings are significant?', options: ['RR 28', 'HR 80', 'Temp 37', 'SPO2 98%'] },
                    2: { question: 'Analyze Cues: The findings are consistent with...', options: ['Pneumonia', 'HF', 'COPD'] },
                    3: { question: 'Prioritize Hypotheses: The most urgent problem is...', options: ['Airway', 'Breathing', 'Circulation'] },
                    4: { question: 'Generate Solutions: The nurse should...', options: ['Apply O2', 'Give Fluids', 'Give Antibiotics'] },
                    5: { question: 'Take Action: The nurse administers...', options: ['Albuterol', 'Furosemide', 'Tylenol'] },
                    6: { question: 'Evaluate Outcomes: The nurse knows the treatment is effective if...', options: ['RR decreases', 'Urine output increases', 'HR decreases'] }
                }
            }),
            correctAnswer: JSON.stringify({ 1: 0, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0 }), // Demo values
            explanation: 'Detailed case study explanation.',
        }
    ];

    for (const q of questions) {
        await db.insert(qbankQuestions).values({
            questionBankId: bank.id,
            categoryId: category.id,
            question: q.question,
            questionType: q.questionType,
            options: q.options,
            correctAnswer: q.correctAnswer.toString(),
            explanation: q.explanation,
            testType: 'ngn', // or mixed
            difficulty: 'medium',
        });
    }

    console.log('Validation Q-Bank seeded successfully.');
}

main().catch(console.error);

