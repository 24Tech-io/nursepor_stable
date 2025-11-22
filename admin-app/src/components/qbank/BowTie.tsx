'use client';

import { useState } from 'react';

export default function BowTie({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [assessmentFindings, setAssessmentFindings] = useState(question.bowtieData?.assessmentFindings || ['Finding 1', 'Finding 2']);
  const [condition, setCondition] = useState(question.bowtieData?.condition || '');
  const [nursingActions, setNursingActions] = useState(question.bowtieData?.nursingActions || ['Action 1', 'Action 2']);

  const updateBowTie = (newFindings: string[], newCondition: string, newActions: string[]) => {
    const bowtieData = {
      assessmentFindings: newFindings,
      condition: newCondition,
      nursingActions: newActions,
    };
    onChange({ ...question, bowtieData, correctAnswer: { findings: newFindings, condition: newCondition, actions: newActions } });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Bow-Tie Item:</strong> 3 central areas - Left: Assessment findings (2 choices), Center: Single most likely condition (1 choice), Right: 2 nursing actions (priority interventions).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Assessment Findings */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Findings (2 choices)</label>
          {assessmentFindings.map((finding: string, idx: number) => (
            <input
              key={idx}
              value={finding}
              onChange={(e) => {
                const newFindings = [...assessmentFindings];
                newFindings[idx] = e.target.value;
                setAssessmentFindings(newFindings);
                updateBowTie(newFindings, condition, nursingActions);
              }}
              placeholder={`Finding ${idx + 1}`}
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>

        {/* Center: Condition */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Most Likely Condition (1 choice)</label>
          <input
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value);
              updateBowTie(assessmentFindings, e.target.value, nursingActions);
            }}
            placeholder="Condition"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Right: Nursing Actions */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nursing Actions (2 priority interventions)</label>
          {nursingActions.map((action: string, idx: number) => (
            <input
              key={idx}
              value={action}
              onChange={(e) => {
                const newActions = [...nursingActions];
                newActions[idx] = e.target.value;
                setNursingActions(newActions);
                updateBowTie(assessmentFindings, condition, newActions);
              }}
              placeholder={`Action ${idx + 1}`}
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

