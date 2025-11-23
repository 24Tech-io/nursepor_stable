'use client';

import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import FileUpload from './FileUpload';

interface DocumentUploadModalProps {
  onClose: () => void;
  onSave: (title: string, documentUrl: string) => void;
}

export default function DocumentUploadModal({ onClose, onSave }: DocumentUploadModalProps) {
  const [title, setTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  const handleSave = () => {
    if (!title) {
      alert('Please enter a document title');
      return;
    }

    if (!documentUrl) {
      alert('Please upload a document');
      return;
    }

    onSave(title, documentUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={24} />
            Add Document
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <FileUpload
              type="document"
              label="Upload Document (PDF, PPT, DOC, etc.)"
              onUploadComplete={(url) => setDocumentUrl(url)}
              maxSizeMB={50}
            />
            <p className="text-xs text-slate-500 mt-2">
              Supported formats: PDF, PowerPoint (.ppt, .pptx), Word (.doc, .docx)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              Add Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


