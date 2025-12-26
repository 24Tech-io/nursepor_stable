'use client';

import { useState } from 'react';

export default function TrendItem({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [tabs, setTabs] = useState(question.trendTabs || {
    vitals: {},
    notes: {},
    labs: {},
    intakeOutput: {},
    mar: {},
    imaging: {},
  });

  const [options, setOptions] = useState<any[]>(Array.isArray(question.options) ? question.options : [{ id: 0, text: '' }, { id: 1, text: '' }]);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer || 0);

  const updateQuestion = (newTabs: any, newOptions: any[], newCorrect: any) => {
    // Save everything. 
    // trendTabs -> options.trendTabs? 
    // In Rendering: `const trendData = currentQuestion.options as any;`
    // And renderTrendItem used `trendData.trendTabs` and `trendData.options`!!
    // SO `question.options` needs to contain BOTH `trendTabs` AND `options` (the answer choices).
    // This is tricky. 
    // `question` prop here is the WHOLE question object from Builder/DB? 
    // Schema: options (JSON), correctAnswer (JSON).
    // In Builder: we usually modify `question`.
    // Let's bundle everything into `trendData` structure that renderer expects.

    const combinedOptions = {
      ...question.options, // keep existing fields
      trendTabs: newTabs,
      options: newOptions,
      question: question.question // Redundant but helpful if renderer looks here
    };

    onChange({
      ...question,
      trendTabs: newTabs, // Keep top level for this editor state if needed
      options: combinedOptions, // This goes to DB options column
      correctAnswer: newCorrect
    });
  };

  const handleOptionChange = (idx: number, text: string) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], text, id: idx };
    setOptions(newOpts);
    updateQuestion(tabs, newOpts, correctAnswer);
  };

  const addOption = () => {
    const newOpts = [...options, { id: options.length, text: '' }];
    setOptions(newOpts);
    updateQuestion(tabs, newOpts, correctAnswer);
  };

  const currentTabNames = [
    { key: 'vitals', label: 'Vitals' },
    { key: 'notes', label: 'Notes' },
    { key: 'labs', label: 'Labs' },
    { key: 'intakeOutput', label: 'Intake/Output' },
    { key: 'mar', label: 'MAR' },
    { key: 'imaging', label: 'Imaging' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Trend Item Builder:</strong> 1. Define Chart Data (Tabs). 2. Define the Priority Question and Answer Options.
        </p>
      </div>

      {/* 1. Tab Data */}
      <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/50">
        <h3 className="font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">1. Clinical Data (JSON)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentTabNames.map((tab) => (
            <div key={tab.key} className="border border-slate-700 rounded-lg p-3 bg-slate-800">
              <h4 className="font-semibold text-slate-400 mb-2 text-xs uppercase">{tab.label}</h4>
              <textarea
                value={typeof tabs[tab.key] === 'string' ? tabs[tab.key] : JSON.stringify(tabs[tab.key] || {}, null, 2)}
                onChange={(e) => {
                  const newTabs = { ...tabs };
                  try {
                    newTabs[tab.key] = JSON.parse(e.target.value);
                  } catch {
                    newTabs[tab.key] = e.target.value;
                  }
                  setTabs(newTabs);
                  updateQuestion(newTabs, options, correctAnswer);
                }}
                rows={4}
                className="w-full px-3 py-2 bg-[#11131a] border border-slate-700 rounded text-slate-200 text-xs font-mono"
                placeholder="JSON Data..."
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Question & Options */}
      <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/50">
        <h3 className="font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">2. Question & Correct Answer</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-1">Nursing Priority Question</label>
          <textarea
            value={question.question || ''}
            onChange={(e) => {
              const qText = e.target.value;
              const newQuestion = { ...question, question: qText };
              // Also update the options.question field for renderer consistency
              const combinedOptions = { ...question.options, trendTabs: tabs, options, question: qText };
              onChange({ ...newQuestion, options: combinedOptions });
            }}
            rows={2}
            className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-400">Answer Options (Select Correct)</label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="radio"
                name="correctTrend"
                checked={correctAnswer === idx}
                onChange={() => {
                  setCorrectAnswer(idx);
                  updateQuestion(tabs, options, idx);
                }}
                className="w-4 h-4 text-blue-600 accent-blue-600"
              />
              <input
                value={opt.text}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 px-3 py-2 bg-[#11131a] border border-slate-700 rounded text-slate-200 text-sm"
              />
            </div>
          ))}
          <button onClick={addOption} className="text-xs text-blue-400 hover:text-blue-300 mt-2">+ Add Option</button>
        </div>
      </div>
    </div>
  );
}

