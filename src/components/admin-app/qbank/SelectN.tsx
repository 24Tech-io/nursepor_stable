'use client';

import { useState } from 'react';

export default function SelectN({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [selectNCount, setSelectNCount] = useState(question.selectNCount || 3);
  const [options, setOptions] = useState(question.options || ['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState(question.correctAnswer || []);

  const updateQuestion = (newSelectN: number, newOptions: string[], newCorrect: number[]) => {
    onChange({
      ...question,
      selectNCount: newSelectN,
      options: newOptions,
      correctAnswer: newCorrect,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Select N:</strong> Students must select exactly N options. Example: "Select 3 responses."
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Number of Options to Select (N)</label>
        <input
          type="number"
          min="1"
          max={options.length}
          value={selectNCount}
          onChange={(e) => {
            const newCount = parseInt(e.target.value);
            setSelectNCount(newCount);
            updateQuestion(newCount, options, correctAnswers);
          }}
          className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Options</label>
        {options.map((opt: string, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={correctAnswers.includes(idx)}
              onChange={(e) => {
                let newCorrect = [...correctAnswers];
                if (e.target.checked) {
                  if (newCorrect.length < selectNCount) {
                    newCorrect.push(idx);
                  }
                } else {
                  newCorrect = newCorrect.filter(i => i !== idx);
                }
                setCorrectAnswers(newCorrect);
                updateQuestion(selectNCount, options, newCorrect);
              }}
              disabled={!correctAnswers.includes(idx) && correctAnswers.length >= selectNCount}
              className="w-5 h-5 text-purple-500 rounded accent-purple-500 disabled:opacity-50"
            />
            <input
              value={opt}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[idx] = e.target.value;
                setOptions(newOptions);
                updateQuestion(selectNCount, newOptions, correctAnswers);
              }}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const newOptions = [...options, ''];
            setOptions(newOptions);
            updateQuestion(selectNCount, newOptions, correctAnswers);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Option
        </button>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
        <p className="text-sm text-yellow-300">
          Selected: {correctAnswers.length} of {selectNCount} required
        </p>
      </div>
    </div>
  );
}

