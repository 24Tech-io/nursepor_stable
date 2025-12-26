'use client';

import React, { useState } from 'react';
import { X, Video, Link as LinkIcon } from 'lucide-react';
import { parseVideoUrl } from '@/lib/video-utils';

interface VideoUploadModalProps {
  onClose: () => void;
  onSave: (title: string, videoUrl: string) => void;
  initialData?: { title: string; videoUrl: string };
}

export default function VideoUploadModal({ onClose, onSave, initialData }: VideoUploadModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '');

  const handleSave = () => {
    if (!title) {
      alert('Please enter a title');
      return;
    }

    if (!videoUrl) {
      alert('Please enter a video URL');
      return;
    }

    // Convert video URL to embed format if provided (hides branding)
    let finalVideoUrl = videoUrl;
    if (videoUrl) {
      const parsed = parseVideoUrl(videoUrl);
      finalVideoUrl = parsed.embedUrl; // Use embed URL with privacy settings
    }

    onSave(title, finalVideoUrl || videoUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Video size={24} />
            {initialData ? 'Edit Video Content' : 'Add Video Content'}
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
            <label className="block text-sm font-bold text-slate-400 mb-2">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Video URL</label>
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm">
              <LinkIcon size={16} />
              <span>Paste a YouTube or Vimeo link</span>
            </div>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              Supports YouTube and Vimeo URLs
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
              {initialData ? 'Update Video' : 'Add Video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}








