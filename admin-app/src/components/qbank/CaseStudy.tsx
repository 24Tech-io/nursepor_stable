'use client';

import { useState } from 'react';

const CJMM_STEPS = [
  { step: 1, name: 'Recognize Cues', description: 'Pick relevant vs irrelevant data (often matrix or select-all)' },
  { step: 2, name: 'Analyze Cues', description: 'Interpret meaning (e.g., ABGs, labs, assessment) - usually matrix/grid' },
  { step: 3, name: 'Prioritize Hypotheses', description: 'Identify most likely condition(s) - often drag-drop ranking' },
  { step: 4, name: 'Generate Solutions', description: 'Decide potential nursing actions - SATA or matrix format' },
  { step: 5, name: 'Take Action', description: 'Choose best interventions - may include medications, safety, or escalation steps' },
  { step: 6, name: 'Evaluate Outcomes', description: 'Expected vs unexpected outcomes - Improvement vs deterioration' },
];

export default function CaseStudy({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [caseTitle, setCaseTitle] = useState(question.caseTitle || '');
  const [caseDescription, setCaseDescription] = useState(question.caseDescription || '');
  const [caseData, setCaseData] = useState(question.caseData || {});
  const [currentStep, setCurrentStep] = useState(1);
  const [stepQuestions, setStepQuestions] = useState(question.stepQuestions || {});

  const updateCaseStudy = (newTitle: string, newDesc: string, newData: any, newSteps: any) => {
    onChange({
      ...question,
      caseTitle: newTitle,
      caseDescription: newDesc,
      caseData: newData,
      stepQuestions: newSteps,
      caseStudyStep: currentStep,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Case Study (6-step CJMM):</strong> Each case has 6 sequential questions based on the Clinical Judgment Measurement Model (CJMM).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Case Study Title</label>
        <input
          value={caseTitle}
          onChange={(e) => {
            setCaseTitle(e.target.value);
            updateCaseStudy(e.target.value, caseDescription, caseData, stepQuestions);
          }}
          className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Case Study Title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Case Description / Patient Scenario</label>
        <textarea
          value={caseDescription}
          onChange={(e) => {
            setCaseDescription(e.target.value);
            updateCaseStudy(caseTitle, e.target.value, caseData, stepQuestions);
          }}
          rows={6}
          className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter patient scenario, background information, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">CJMM Steps</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CJMM_STEPS.map((step) => (
            <button
              key={step.step}
              onClick={() => setCurrentStep(step.step)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                currentStep === step.step
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Step {step.step}
            </button>
          ))}
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-slate-200 mb-1">
            Step {currentStep}: {CJMM_STEPS[currentStep - 1].name}
          </h4>
          <p className="text-sm text-slate-400">{CJMM_STEPS[currentStep - 1].description}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Question for Step {currentStep}</label>
          <textarea
            value={stepQuestions[currentStep]?.question || ''}
            onChange={(e) => {
              const newSteps = { ...stepQuestions };
              newSteps[currentStep] = { ...newSteps[currentStep], question: e.target.value };
              setStepQuestions(newSteps);
              updateCaseStudy(caseTitle, caseDescription, caseData, newSteps);
            }}
            rows={3}
            className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder={`Enter question for ${CJMM_STEPS[currentStep - 1].name}`}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Options</label>
          {(stepQuestions[currentStep]?.options || ['', '', '', '']).map((opt: string, idx: number) => (
            <input
              key={idx}
              value={opt}
              onChange={(e) => {
                const newSteps = { ...stepQuestions };
                if (!newSteps[currentStep]) newSteps[currentStep] = { question: '', options: [], correctAnswer: 0 };
                const newOptions = [...(newSteps[currentStep].options || ['', '', '', ''])];
                newOptions[idx] = e.target.value;
                newSteps[currentStep].options = newOptions;
                setStepQuestions(newSteps);
                updateCaseStudy(caseTitle, caseDescription, caseData, newSteps);
              }}
              placeholder={`Option ${idx + 1}`}
              className="w-full mb-2 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Correct Answer</label>
          <select
            value={stepQuestions[currentStep]?.correctAnswer || 0}
            onChange={(e) => {
              const newSteps = { ...stepQuestions };
              if (!newSteps[currentStep]) newSteps[currentStep] = { question: '', options: [], correctAnswer: 0 };
              newSteps[currentStep].correctAnswer = parseInt(e.target.value);
              setStepQuestions(newSteps);
              updateCaseStudy(caseTitle, caseDescription, caseData, newSteps);
            }}
            className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {(stepQuestions[currentStep]?.options || ['', '', '', '']).map((opt: string, idx: number) => (
              <option key={idx} value={idx} className="bg-[#11131a] text-slate-200">
                Option {idx + 1}: {opt || '(empty)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
        <p className="text-sm text-yellow-300">
          Progress: {Object.keys(stepQuestions).length} of 6 steps completed
        </p>
      </div>
    </div>
  );
}

