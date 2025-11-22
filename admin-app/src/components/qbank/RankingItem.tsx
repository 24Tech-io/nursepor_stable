'use client';

import { useState } from 'react';

export default function RankingItem({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [items, setItems] = useState(question.rankingData?.items || ['Item 1', 'Item 2', 'Item 3']);
  const [correctOrder, setCorrectOrder] = useState(question.rankingData?.correctOrder || [0, 1, 2]);

  const updateRanking = (newItems: string[], newOrder: number[]) => {
    const rankingData = { items: newItems, correctOrder: newOrder };
    onChange({ ...question, rankingData, correctAnswer: newOrder });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Ranking Items:</strong> Students order items by priority, importance, or sequence.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Items to Rank</label>
        {items.map((item: string, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-purple-500/20 text-purple-300 rounded-lg flex items-center justify-center font-semibold text-sm border border-purple-500/30">
              {correctOrder.indexOf(idx) + 1}
            </span>
            <input
              value={item}
              onChange={(e) => {
                const newItems = [...items];
                newItems[idx] = e.target.value;
                setItems(newItems);
                updateRanking(newItems, correctOrder);
              }}
              placeholder={`Item ${idx + 1}`}
              className="flex-1 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={() => {
                if (idx > 0) {
                  const newOrder = [...correctOrder];
                  const currentPos = newOrder.indexOf(idx);
                  const prevPos = newOrder.indexOf(idx - 1);
                  [newOrder[currentPos], newOrder[prevPos]] = [newOrder[prevPos], newOrder[currentPos]];
                  setCorrectOrder(newOrder);
                  updateRanking(items, newOrder);
                }
              }}
              disabled={idx === 0}
              className="px-2 py-1 text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              ↑
            </button>
            <button
              onClick={() => {
                if (idx < items.length - 1) {
                  const newOrder = [...correctOrder];
                  const currentPos = newOrder.indexOf(idx);
                  const nextPos = newOrder.indexOf(idx + 1);
                  [newOrder[currentPos], newOrder[nextPos]] = [newOrder[nextPos], newOrder[currentPos]];
                  setCorrectOrder(newOrder);
                  updateRanking(items, newOrder);
                }
              }}
              disabled={idx === items.length - 1}
              className="px-2 py-1 text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              ↓
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newItems = [...items, `Item ${items.length + 1}`];
            const newOrder = [...correctOrder, items.length];
            setItems(newItems);
            setCorrectOrder(newOrder);
            updateRanking(newItems, newOrder);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Item
        </button>
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
        <p className="text-sm text-green-300">
          Correct order: {correctOrder.map((idx: number) => items[idx]).join(' → ')}
        </p>
      </div>
    </div>
  );
}

