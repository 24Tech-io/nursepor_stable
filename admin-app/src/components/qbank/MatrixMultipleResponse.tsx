'use client';

import { useState } from 'react';

export default function MatrixMultipleResponse({
  question,
  onChange,
}: {
  question: any;
  onChange: (q: any) => void;
}) {
  const [rows, setRows] = useState(question.matrixData?.rows || ['Option 1', 'Option 2']);
  const [columns, setColumns] = useState(question.matrixData?.columns || ['Yes', 'No']);
  const [responses, setResponses] = useState(question.matrixData?.responses || {});

  const updateMatrixData = (newRows: string[], newColumns: string[], newResponses: any) => {
    const matrixData = { rows: newRows, columns: newColumns, responses: newResponses };
    onChange({ ...question, matrixData, correctAnswer: newResponses });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Matrix Multiple Response:</strong> Create a grid where rows are options and
          columns are response choices (e.g., Yes/No, Appropriate/Inappropriate).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Row Options (Items to evaluate)
        </label>
        {rows.map((row: string, idx: number) => (
          <input
            key={idx}
            value={row}
            onChange={(e) => {
              const newRows = [...rows];
              newRows[idx] = e.target.value;
              setRows(newRows);
              updateMatrixData(newRows, columns, responses);
            }}
            placeholder={`Row ${idx + 1}`}
            className="w-full mb-2 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        ))}
        <button
          onClick={() => {
            const newRows = [...rows, `Option ${rows.length + 1}`];
            setRows(newRows);
            updateMatrixData(newRows, columns, responses);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Row
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Column Responses</label>
        {columns.map((col: string, idx: number) => (
          <input
            key={idx}
            value={col}
            onChange={(e) => {
              const newColumns = [...columns];
              newColumns[idx] = e.target.value;
              setColumns(newColumns);
              updateMatrixData(rows, newColumns, responses);
            }}
            placeholder={`Column ${idx + 1}`}
            className="w-full mb-2 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        ))}
        <button
          onClick={() => {
            const newColumns = [...columns, `Response ${columns.length + 1}`];
            setColumns(newColumns);
            updateMatrixData(rows, newColumns, responses);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Column
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Matrix Preview & Correct Answers
        </label>
        <div className="border border-slate-700 rounded-lg overflow-hidden bg-[#11131a]">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Item</th>
                {columns.map((col: string, idx: number) => (
                  <th
                    key={idx}
                    className="px-4 py-2 text-center text-sm font-medium text-slate-300"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: string, rowIdx: number) => (
                <tr key={rowIdx} className="border-t border-slate-700">
                  <td className="px-4 py-2 text-sm font-medium text-slate-200">{row}</td>
                  {columns.map((col: string, colIdx: number) => {
                    const key = `${rowIdx}-${colIdx}`;
                    const isChecked = responses[key] === true;
                    return (
                      <td key={colIdx} className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newResponses = { ...responses, [key]: e.target.checked };
                            setResponses(newResponses);
                            updateMatrixData(rows, columns, newResponses);
                          }}
                          className="w-5 h-5 text-purple-500 rounded accent-purple-500"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
