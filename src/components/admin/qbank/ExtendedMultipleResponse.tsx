'use client';

import { useState } from 'react';

export default function ExtendedMultipleResponse({
  question,
  onChange,
}: {
  question: any;
  onChange: (q: any) => void;
}) {
  const [options, setOptions] = useState(question.options || ['', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState(
    Array.isArray(question.correctAnswer) ? question.correctAnswer : []
  );
  const [highlightText, setHighlightText] = useState(question.highlightData?.text || '');
  const [highlights, setHighlights] = useState(question.highlightData?.highlights || []);

  const updateQuestion = (
    newOptions: string[],
    newCorrect: number[],
    newText: string,
    newHighlights: any[]
  ) => {
    onChange({
      ...question,
      options: newOptions,
      correctAnswer: newCorrect,
      highlightData: { text: newText, highlights: newHighlights },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Extended Multiple Response:</strong> May include mini drop-down responses or
          highlight text options.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Question Text with Highlightable Areas
        </label>
        <textarea
          value={highlightText}
          onChange={(e) => {
            setHighlightText(e.target.value);
            updateQuestion(options, correctAnswers, e.target.value, highlights);
          }}
          rows={4}
          className="w-full px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter text. Use [highlight]text[/highlight] to mark highlightable areas."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Response Options</label>
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
                updateQuestion(options, newCorrect, highlightText, highlights);
              }}
              className="w-5 h-5 text-purple-500 rounded accent-purple-500"
            />
            <input
              value={opt}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[idx] = e.target.value;
                setOptions(newOptions);
                updateQuestion(newOptions, correctAnswers, highlightText, highlights);
              }}
              placeholder={`Response ${idx + 1}`}
              className="flex-1 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const newOptions = [...options, ''];
            setOptions(newOptions);
            updateQuestion(newOptions, correctAnswers, highlightText, highlights);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Response Option
        </button>
      </div>
    </div>
  );
}
