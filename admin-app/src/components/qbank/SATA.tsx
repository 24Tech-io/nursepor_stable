'use client';

import { useState } from 'react';

export default function SATA({
  question,
  onChange,
}: {
  question: any;
  onChange: (q: any) => void;
}) {
  const [options, setOptions] = useState(question.options || ['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState(
    Array.isArray(question.correctAnswer) ? question.correctAnswer : []
  );

  const updateQuestion = (newOptions: string[], newCorrect: number[]) => {
    onChange({
      ...question,
      options: newOptions,
      correctAnswer: newCorrect,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Select All That Apply (SATA):</strong> Traditional SATA format. Students select
          all correct options. No predetermined number of correct answers.
        </p>
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
                  newCorrect.push(idx);
                } else {
                  newCorrect = newCorrect.filter((i) => i !== idx);
                }
                setCorrectAnswers(newCorrect);
                updateQuestion(options, newCorrect);
              }}
              className="w-5 h-5 text-purple-500 rounded accent-purple-500"
            />
            <input
              value={opt}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[idx] = e.target.value;
                setOptions(newOptions);
                updateQuestion(newOptions, correctAnswers);
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
            updateQuestion(newOptions, correctAnswers);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Option
        </button>
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
        <p className="text-sm text-green-300">
          Correct answers selected: {correctAnswers.length} option(s)
        </p>
      </div>
    </div>
  );
}
