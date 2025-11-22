'use client';

import { useState } from 'react';

export default function ClozeDropdown({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [text, setText] = useState(question.clozeData?.text || '');
  const [dropdowns, setDropdowns] = useState(question.clozeData?.dropdowns || []);

  const updateCloze = (newText: string, newDropdowns: any[]) => {
    const clozeData = { text: newText, dropdowns: newDropdowns };
    onChange({ ...question, clozeData, correctAnswer: newDropdowns });
  };

  const addDropdown = (position: number) => {
    const newDropdowns = [...dropdowns, { position, options: ['Option 1', 'Option 2', 'Option 3'], correct: 0 }];
    setDropdowns(newDropdowns);
    updateCloze(text, newDropdowns);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Cloze / Drop-Down:</strong> Text with embedded drop-downs. Each drop-down has 3-5 answer choices. Used for medication calculation, nursing judgment, or lab interpretation.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            updateCloze(e.target.value, dropdowns);
          }}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="Enter text. Use [DROPDOWN] to mark where drop-downs should appear."
        />
        <p className="mt-1 text-xs text-gray-500">Use [DROPDOWN] in your text to mark drop-down positions</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Drop-Downs</label>
        {dropdowns.map((dropdown: any, idx: number) => (
          <div key={idx} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Drop-Down {idx + 1}</span>
              <button
                onClick={() => {
                  const newDropdowns = dropdowns.filter((_: any, i: number) => i !== idx);
                  setDropdowns(newDropdowns);
                  updateCloze(text, newDropdowns);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2">
              {dropdown.options.map((opt: string, optIdx: number) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`dropdown-${idx}`}
                    checked={dropdown.correct === optIdx}
                    onChange={() => {
                      const newDropdowns = [...dropdowns];
                      newDropdowns[idx].correct = optIdx;
                      setDropdowns(newDropdowns);
                      updateCloze(text, newDropdowns);
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <input
                    value={opt}
                    onChange={(e) => {
                      const newDropdowns = [...dropdowns];
                      newDropdowns[idx].options[optIdx] = e.target.value;
                      setDropdowns(newDropdowns);
                      updateCloze(text, newDropdowns);
                    }}
                    placeholder={`Option ${optIdx + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const newDropdowns = [...dropdowns];
                  newDropdowns[idx].options.push(`Option ${dropdown.options.length + 1}`);
                  setDropdowns(newDropdowns);
                  updateCloze(text, newDropdowns);
                }}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                + Add Option
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => addDropdown(text.length)}
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200"
        >
          + Add Drop-Down
        </button>
      </div>
    </div>
  );
}

