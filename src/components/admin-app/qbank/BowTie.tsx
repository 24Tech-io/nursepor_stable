'use client';

import { useState } from 'react';

export default function BowTie({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  // Initialize with correct data structure
  // bowtieData = { assessmentFindings: [], condition: [], nursingActions: [] } (THE POOLS)
  // correctAnswer = { findings: [], condition: "", actions: [] } (THE ANSWERS)

  const [findingsOptions, setFindingsOptions] = useState<string[]>(question.bowtieData?.assessmentFindings || ['', '', '', '']); // Default 4
  const [conditionOptions, setConditionOptions] = useState<string[]>(question.bowtieData?.condition || ['', '', '', '']); // Default 4
  const [actionsOptions, setActionsOptions] = useState<string[]>(question.bowtieData?.nursingActions || ['', '', '', '']); // Default 4

  // Selections (Correct Answers)
  const [correctFindings, setCorrectFindings] = useState<string[]>(question.correctAnswer?.findings || []);
  const [correctCondition, setCorrectCondition] = useState<string>(question.correctAnswer?.condition || '');
  const [correctActions, setCorrectActions] = useState<string[]>(question.correctAnswer?.actions || []);

  const updateQuestion = (
    fOpts: string[], cOpts: string[], aOpts: string[],
    cFinds: string[], cCond: string, cActs: string[]
  ) => {
    // Save POOLS to bowtieData (so student sees these options)
    const bowtieData = {
      assessmentFindings: fOpts.filter(o => o.trim() !== ''),
      condition: cOpts.filter(o => o.trim() !== ''), // Note: In renderer this was "condition" string? Wait. 
      // Renderer check: 
      // Left: `bowtieData.assessmentFindings` (Array of strings)
      // Center: `bowtieData.condition` (Was string in old builder? In Renderer: `bowtieData.condition` IS THE DISPLAY)
      // Wait, Renderer Step 152: 
      // <button>{bowtieData.condition || 'Condition'}</button>
      // The renderer I wrote assumed `bowtieData.condition` was a STRING label. 
      // BUT for a REAL BowTie, the student must SELECT from options.
      // So `bowtieData.condition` SHOULD be an ARRAY of options for the center well.
      // I need to update the Renderer to handle `bowtieData.condition` being an array of options (or rename it `bowtieData.conditions`?).
      // Let's keep `bowtieData` structure consistent with "Options Pool".
      // So `bowtieData.condition` in DB should be Array of strings (options).
      // The Renderer renders `bowtieData.condition` as options.
      // My Renderer implementation (Step 152) seemed to treat it as a single label?
      // "Temporary: Render the 'condition' as the only option... I will render what is provided."
      // OK, I must fix Renderer as well if I change this data structure. 
      // Let's make `bowtieData.condition` an ARRAY of options here.
      nursingActions: aOpts.filter(o => o.trim() !== ''),
    };

    // Save CORRECT ANSWERS to correctAnswer
    const correctAnswer = {
      findings: cFinds,
      condition: cCond,
      actions: cActs
    };

    onChange({ ...question, bowtieData, correctAnswer });
  };

  const handleOptionChange = (type: 'findings' | 'condition' | 'actions', idx: number, val: string) => {
    if (type === 'findings') {
      const newOpts = [...findingsOptions];
      newOpts[idx] = val;
      setFindingsOptions(newOpts);
      updateQuestion(newOpts, conditionOptions, actionsOptions, correctFindings, correctCondition, correctActions);
    } else if (type === 'condition') {
      const newOpts = [...conditionOptions];
      newOpts[idx] = val;
      setConditionOptions(newOpts);
      updateQuestion(findingsOptions, newOpts, actionsOptions, correctFindings, correctCondition, correctActions);
    } else {
      const newOpts = [...actionsOptions];
      newOpts[idx] = val;
      setActionsOptions(newOpts);
      updateQuestion(findingsOptions, conditionOptions, newOpts, correctFindings, correctCondition, correctActions);
    }
  };

  const toggleCorrectFinding = (val: string) => {
    if (!val) return;
    let newCorrect = [...correctFindings];
    if (newCorrect.includes(val)) newCorrect = newCorrect.filter(c => c !== val);
    else if (newCorrect.length < 2) newCorrect.push(val); // Max 2
    setCorrectFindings(newCorrect);
    updateQuestion(findingsOptions, conditionOptions, actionsOptions, newCorrect, correctCondition, correctActions);
  };

  const setCorrectCond = (val: string) => {
    setCorrectCondition(val);
    updateQuestion(findingsOptions, conditionOptions, actionsOptions, correctFindings, val, correctActions);
  };

  const toggleCorrectAction = (val: string) => {
    if (!val) return;
    let newCorrect = [...correctActions];
    if (newCorrect.includes(val)) newCorrect = newCorrect.filter(c => c !== val);
    else if (newCorrect.length < 2) newCorrect.push(val); // Max 2
    setCorrectActions(newCorrect);
    updateQuestion(findingsOptions, conditionOptions, actionsOptions, correctFindings, correctCondition, newCorrect);
  };

  // Helper to add empty option slot
  const addOptionSlot = (type: 'findings' | 'condition' | 'actions') => {
    if (type === 'findings') setFindingsOptions([...findingsOptions, '']);
    if (type === 'condition') setConditionOptions([...conditionOptions, '']);
    if (type === 'actions') setActionsOptions([...actionsOptions, '']);
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Bow-Tie Builder:</strong> Define options for each category. Click the <strong>Checkmark</strong> to mark options as CORRECT.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Assessment Findings */}
        <div className="bg-blue-900/10 rounded-lg p-4 border border-blue-500/30">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-blue-400">Findings (Select 2 Correct)</label>
            <button onClick={() => addOptionSlot('findings')} className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 text-white">+</button>
          </div>
          {findingsOptions.map((opt, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <button
                onClick={() => toggleCorrectFinding(opt)}
                className={`px-2 rounded border ${correctFindings.includes(opt) && opt ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
              >
                ✓
              </button>
              <input
                value={opt}
                onChange={(e) => handleOptionChange('findings', idx, e.target.value)}
                placeholder={`Finding Option ${idx + 1}`}
                className="flex-1 w-full px-3 py-2 bg-[#11131a] border border-slate-700 rounded text-slate-200 text-sm"
              />
            </div>
          ))}
        </div>

        {/* Center: Condition */}
        <div className="bg-purple-900/10 rounded-lg p-4 border border-purple-500/30">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-purple-400">Condition (Select 1 Correct)</label>
            <button onClick={() => addOptionSlot('condition')} className="text-xs bg-purple-600 px-2 py-1 rounded hover:bg-purple-500 text-white">+</button>
          </div>
          {conditionOptions.map((opt, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <button
                onClick={() => setCorrectCond(opt)}
                className={`px-2 rounded border ${correctCondition === opt && opt ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
              >
                ✓
              </button>
              <input
                value={opt}
                onChange={(e) => handleOptionChange('condition', idx, e.target.value)}
                placeholder={`Condition Option ${idx + 1}`}
                className="flex-1 w-full px-3 py-2 bg-[#11131a] border border-slate-700 rounded text-slate-200 text-sm"
              />
            </div>
          ))}
        </div>

        {/* Right: Nursing Actions */}
        <div className="bg-green-900/10 rounded-lg p-4 border border-green-500/30">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-green-400">Actions (Select 2 Correct)</label>
            <button onClick={() => addOptionSlot('actions')} className="text-xs bg-green-600 px-2 py-1 rounded hover:bg-green-500 text-white">+</button>
          </div>
          {actionsOptions.map((opt, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <button
                onClick={() => toggleCorrectAction(opt)}
                className={`px-2 rounded border ${correctActions.includes(opt) && opt ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
              >
                ✓
              </button>
              <input
                value={opt}
                onChange={(e) => handleOptionChange('actions', idx, e.target.value)}
                placeholder={`Action Option ${idx + 1}`}
                className="flex-1 w-full px-3 py-2 bg-[#11131a] border border-slate-700 rounded text-slate-200 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

