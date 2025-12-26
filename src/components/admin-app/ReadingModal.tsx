'use client';

import React, { useState } from 'react';
import { X, FileText, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface ReadingModalProps {
    onClose: () => void;
    onSave: (title: string, content: string, readingTime: number) => void;
    initialData?: { title: string; textbookContent: string; readingTime: number };
}

export default function ReadingModal({ onClose, onSave, initialData }: ReadingModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.textbookContent || '');
    const [readingTime, setReadingTime] = useState(initialData?.readingTime || 10);

    const handleSave = () => {
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }
        if (!content.trim()) {
            alert('Please enter some content');
            return;
        }

        onSave(title, content, readingTime);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText size={24} className="text-blue-400" />
                        {initialData ? 'Edit Reading Material' : 'Add Reading Material'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-400 mb-2">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Introduction to Anatomy"
                                className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Reading Time (mins)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    value={readingTime}
                                    onChange={(e) => setReadingTime(parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-2 pl-10 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                />
                                <Clock size={16} className="absolute left-3 top-3 text-slate-500" />
                            </div>
                        </div>
                    </div>

                    <label className="block text-sm font-bold text-slate-400 mb-2">Content</label>
                    <div className="bg-[#1a1d26] border border-slate-800 rounded-lg overflow-hidden text-slate-300">
                        {/* ReactQuill integration */}
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            placeholder="Enter the reading content here/..."
                            className="h-80 mb-12"
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['link', 'image'],
                                    ['clean']
                                ],
                            }}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Add Reading
                    </button>
                </div>
            </div>
        </div>
    );
}
