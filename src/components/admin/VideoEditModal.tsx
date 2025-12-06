'use client';

import React, { useState } from 'react';
import { X, Video } from 'lucide-react';
import { parseVideoUrl } from '@/lib/video-utils';

interface VideoEditModalProps {
  chapter: any;
  onClose: () => void;
  onSave: (chapterId: number, title: string, videoUrl: string) => void;
}

export default function VideoEditModal({ chapter, onClose, onSave }: VideoEditModalProps) {
  const [title, setTitle] = useState(chapter.title || '');
  const [videoUrl, setVideoUrl] = useState(chapter.videoUrl || '');

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!videoUrl) {
      alert('Please provide a video URL');
      return;
    }

    onSave(chapter.id, title, videoUrl);
  };

  // Parse video URL to show provider
  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Video size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Edit Video Content</h3>
              <p className="text-sm text-slate-400">Update video title and source</p>
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
            <label className="block text-sm font-bold text-slate-400 mb-2">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Nursing Fundamentals"
              className="w-full px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Video URL Input */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">
              Video URL (YouTube or Vimeo)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {parsedVideo && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded font-medium">
                  {parsedVideo.provider.toUpperCase()}
                </span>
                <span className="text-slate-400">Video will be embedded (no branding)</span>
              </div>
            )}
          </div>

          {/* Current Video Info */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-300 mb-1">Current Video:</p>
            <p className="text-sm text-blue-200/80 break-all">{chapter.videoUrl}</p>
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
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

