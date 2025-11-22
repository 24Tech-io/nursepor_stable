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

  const updateTabs = (newTabs: any) => {
    onChange({ ...question, trendTabs: newTabs, correctAnswer: newTabs });
  };

  const tabNames = [
    { key: 'vitals', label: 'Vitals' },
    { key: 'notes', label: 'Notes' },
    { key: 'labs', label: 'Labs' },
    { key: 'intakeOutput', label: 'Intake/Output' },
    { key: 'mar', label: 'MAR' },
    { key: 'imaging', label: 'Imaging' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Trend Item:</strong> Multi-tab chart review. Students review several tabs (vitals, notes, labs, intake/output, MAR, imaging) and decide nursing priorities.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tab Data</label>
        <div className="grid grid-cols-2 gap-4">
          {tabNames.map((tab) => (
            <div key={tab.key} className="border border-slate-700 rounded-lg p-4 bg-slate-800">
              <h4 className="font-semibold text-slate-200 mb-2">{tab.label}</h4>
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
                  updateTabs(newTabs);
                }}
                rows={4}
                className="w-full px-3 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                placeholder={`Enter ${tab.label} data (JSON format)`}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Nursing Priority Question</label>
        <textarea
          value={question.question || ''}
          onChange={(e) => onChange({ ...question, question: e.target.value, trendTabs: tabs })}
          rows={3}
          className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="What is the priority nursing action based on the trend data?"
        />
      </div>
    </div>
  );
}

