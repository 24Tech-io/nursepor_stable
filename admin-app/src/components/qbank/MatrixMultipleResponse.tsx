'use client';

import { useState } from 'react';

export default function MatrixMultipleResponse({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [rows, setRows] = useState(question.matrixData?.rows || ['Option 1', 'Option 2']);
  const [columns, setColumns] = useState(question.matrixData?.columns || ['Yes', 'No']);
  const [responses, setResponses] = useState(question.matrixData?.responses || {});

  const updateMatrixData = (newRows: string[], newColumns: string[], newResponses: any) => {
    const matrixData = { rows: newRows, columns: newColumns, responses: newResponses };
    onChange({ ...question, matrixData, correctAnswer: newResponses });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Matrix Multiple Response:</strong> Create a grid where rows are options and columns are response choices (e.g., Yes/No, Appropriate/Inappropriate).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Row Options (Items to evaluate)</label>
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
            className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        ))}
        <button
          onClick={() => {
            const newRows = [...rows, `Option ${rows.length + 1}`];
            setRows(newRows);
            updateMatrixData(newRows, columns, responses);
          }}
          className="mt-2 text-sm text-purple-600 hover:text-purple-700"
        >
          + Add Row
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Column Responses</label>
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
            className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        ))}
        <button
          onClick={() => {
            const newColumns = [...columns, `Response ${columns.length + 1}`];
            setColumns(newColumns);
            updateMatrixData(rows, newColumns, responses);
          }}
          className="mt-2 text-sm text-purple-600 hover:text-purple-700"
        >
          + Add Column
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Matrix Preview & Correct Answers</label>
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                {columns.map((col: string, idx: number) => (
                  <th key={idx} className="px-4 py-2 text-center text-sm font-medium text-gray-700">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: string, rowIdx: number) => (
                <tr key={rowIdx} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{row}</td>
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
                          className="w-5 h-5 text-purple-600 rounded"
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

