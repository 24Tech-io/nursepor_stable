'use client';

import React, { useState } from 'react';
import { X, BookOpen, Eye, Edit3 } from 'lucide-react';

interface ReadingEditModalProps {
  chapter: any;
  onClose: () => void;
  onSave: (chapterId: number, title: string, content: string, readingTime: number) => void;
}

export default function ReadingEditModal({ chapter, onClose, onSave }: ReadingEditModalProps) {
  const [title, setTitle] = useState(chapter.title || '');
  const [content, setContent] = useState(chapter.textbookContent || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Calculate reading time (avg 200 words per minute)
  const calculateReadingTime = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  const readingTime = calculateReadingTime(content);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    onSave(chapter.id, title, content, readingTime);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Edit Reading Content</h3>
              <p className="text-sm text-slate-400">Update textbook chapter or reading material</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'edit'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Edit3 size={16} />
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye size={16} />
            Preview
          </button>
          <div className="ml-auto text-sm text-slate-400">
            <span className="font-semibold">{readingTime}</span> min read
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Chapter Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Cardiovascular System"
              className="w-full px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Content Area */}
          {activeTab === 'edit' ? (
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your reading content here..."
                className="w-full h-96 px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm resize-none"
                style={{ minHeight: '400px' }}
              />
              <p className="text-xs text-slate-500 mt-2">
                📝 Tip: Use clear paragraphs, headings, and bullet points for better readability
              </p>
            </div>
          ) : (
            <div>
              <div className="text-sm font-bold text-slate-400 mb-3">Preview</div>
              <div className="bg-[#1a1d26] border border-slate-800 rounded-lg p-6 min-h-96 prose prose-invert prose-sm max-w-none">
                {title && <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>}
                {content ? (
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No content yet. Start typing in the Edit tab!</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-slate-400">
            {content.trim().split(/\s+/).length} words • {readingTime} min read
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

