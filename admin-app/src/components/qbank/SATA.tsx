'use client';

import { useState } from 'react';

export default function SATA({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [options, setOptions] = useState(question.options || ['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState(Array.isArray(question.correctAnswer) ? question.correctAnswer : []);

  const updateQuestion = (newOptions: string[], newCorrect: number[]) => {
    onChange({
      ...question,
      options: newOptions,
      correctAnswer: newCorrect,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Select All That Apply (SATA):</strong> Traditional SATA format. Students select all correct options. No predetermined number of correct answers.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
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
                updateQuestion(options, newCorrect);
              }}
              className="w-5 h-5 text-purple-600 rounded"
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        ))}
        <button
          onClick={() => {
            const newOptions = [...options, ''];
            setOptions(newOptions);
            updateQuestion(newOptions, correctAnswers);
          }}
          className="mt-2 text-sm text-purple-600 hover:text-purple-700"
        >
          + Add Option
        </button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-800">
          Correct answers selected: {correctAnswers.length} option(s)
        </p>
      </div>
    </div>
  );
}

