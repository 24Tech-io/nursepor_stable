'use client';

import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import FileUpload from './FileUpload';

interface DocumentEditModalProps {
  chapter: any;
  onClose: () => void;
  onSave: (chapterId: number, title: string, documentUrl: string) => void;
}

export default function DocumentEditModal({ chapter, onClose, onSave }: DocumentEditModalProps) {
  const [title, setTitle] = useState(chapter.title || '');
  const [documentUrl, setDocumentUrl] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!documentUrl) {
      alert('Please upload a new document');
      return;
    }

    onSave(chapter.id, title, documentUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Edit Document</h3>
              <p className="text-sm text-slate-400">Update document title and file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Nursing Procedures Manual"
              className="w-full px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Current Document Info */}
          <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-orange-300 mb-1">Current Document:</p>
            <p className="text-sm text-orange-200/80 break-all">
              {chapter.textbookFileUrl || chapter.documentUrl || 'No document'}
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">
              Upload New Document
            </label>
            <FileUpload
              type="document"
              label=""
              currentUrl={documentUrl}
              onUploadComplete={(url: string) => setDocumentUrl(url)}
              maxSizeMB={50}
            />
            <p className="text-xs text-slate-500 mt-2">
              Supported formats: PDF, PPT, PPTX, DOC, DOCX (Max 50MB)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-orange-500/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

