'use client';

import { useState } from 'react';

export default function ExtendedDragDrop({
  question,
  onChange,
}: {
  question: any;
  onChange: (q: any) => void;
}) {
  const [items, setItems] = useState(
    question.dragDropData?.items || ['Item 1', 'Item 2', 'Item 3']
  );
  const [categories, setCategories] = useState(
    question.dragDropData?.categories || ['Category 1', 'Category 2']
  );
  const [correctMapping, setCorrectMapping] = useState(question.dragDropData?.correctMapping || {});

  const updateDragDrop = (newItems: string[], newCategories: string[], newMapping: any) => {
    const dragDropData = {
      items: newItems,
      categories: newCategories,
      correctMapping: newMapping,
    };
    onChange({ ...question, dragDropData, correctAnswer: newMapping });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Extended Drag-and-Drop:</strong> Rank steps, place items in order, or classify
          items into categories.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Draggable Items</label>
        {items.map((item: string, idx: number) => (
          <input
            key={idx}
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx] = e.target.value;
              setItems(newItems);
              updateDragDrop(newItems, categories, correctMapping);
            }}
            placeholder={`Item ${idx + 1}`}
            className="w-full mb-2 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        ))}
        <button
          onClick={() => {
            const newItems = [...items, `Item ${items.length + 1}`];
            setItems(newItems);
            updateDragDrop(newItems, categories, correctMapping);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Item
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Drop Zones / Categories
        </label>
        {categories.map((cat: string, idx: number) => (
          <div key={idx} className="mb-3">
            <input
              value={cat}
              onChange={(e) => {
                const newCategories = [...categories];
                newCategories[idx] = e.target.value;
                setCategories(newCategories);
                updateDragDrop(items, newCategories, correctMapping);
              }}
              placeholder={`Category ${idx + 1}`}
              className="w-full mb-2 px-4 py-2 bg-[#11131a] border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <div className="bg-slate-800 rounded-lg p-3 min-h-[60px] border-2 border-dashed border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Items that belong here:</p>
              {items.map((item: string, itemIdx: number) => {
                const isMapped = correctMapping[itemIdx] === idx;
                return (
                  <label key={itemIdx} className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={isMapped}
                      onChange={(e) => {
                        const newMapping = { ...correctMapping };
                        if (e.target.checked) {
                          newMapping[itemIdx] = idx;
                        } else {
                          delete newMapping[itemIdx];
                        }
                        setCorrectMapping(newMapping);
                        updateDragDrop(items, categories, newMapping);
                      }}
                      className="w-4 h-4 text-purple-500 rounded accent-purple-500"
                    />
                    <span className="text-sm text-slate-200">{item}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const newCategories = [...categories, `Category ${categories.length + 1}`];
            setCategories(newCategories);
            updateDragDrop(items, newCategories, correctMapping);
          }}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300"
        >
          + Add Category
        </button>
      </div>
    </div>
  );
}
