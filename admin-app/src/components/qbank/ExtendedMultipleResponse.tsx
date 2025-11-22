'use client';

import { useState } from 'react';

export default function ExtendedMultipleResponse({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [options, setOptions] = useState(question.options || ['', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState(Array.isArray(question.correctAnswer) ? question.correctAnswer : []);
  const [highlightText, setHighlightText] = useState(question.highlightData?.text || '');
  const [highlights, setHighlights] = useState(question.highlightData?.highlights || []);

  const updateQuestion = (newOptions: string[], newCorrect: number[], newText: string, newHighlights: any[]) => {
    onChange({
      ...question,
      options: newOptions,
      correctAnswer: newCorrect,
      highlightData: { text: newText, highlights: newHighlights },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Extended Multiple Response:</strong> May include mini drop-down responses or highlight text options.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question Text with Highlightable Areas</label>
        <textarea
          value={highlightText}
          onChange={(e) => {
            setHighlightText(e.target.value);
            updateQuestion(options, correctAnswers, e.target.value, highlights);
          }}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="Enter text. Use [highlight]text[/highlight] to mark highlightable areas."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Response Options</label>
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
                  newCorrect = newCorrect.filter(i => i !== idx);
                }
                setCorrectAnswers(newCorrect);
                updateQuestion(options, newCorrect, highlightText, highlights);
              }}
              className="w-5 h-5 text-purple-600 rounded"
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const newOptions = [...options, ''];
            setOptions(newOptions);
            updateQuestion(newOptions, correctAnswers, highlightText, highlights);
          }}
          className="mt-2 text-sm text-purple-600 hover:text-purple-700"
        >
          + Add Response Option
        </button>
      </div>
    </div>
  );
}

