'use client';

import React, { useState } from 'react';
import { X, Video, Upload, Link as LinkIcon } from 'lucide-react';
import FileUpload from './FileUpload';
import { parseVideoUrl } from '@/lib/video-utils';

interface VideoUploadModalProps {
  onClose: () => void;
  onSave: (title: string, videoUrl: string, videoFile: string) => void;
}

export default function VideoUploadModal({ onClose, onSave }: VideoUploadModalProps) {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');

  const handleSave = () => {
    if (!title) {
      alert('Please enter a title');
      return;
    }

    if (uploadMethod === 'url' && !videoUrl) {
      alert('Please enter a video URL');
      return;
    }

    if (uploadMethod === 'file' && !videoFile) {
      alert('Please upload a video file');
      return;
    }

    // Convert video URL to embed format if provided (hides branding)
    let finalVideoUrl = videoUrl;
    if (uploadMethod === 'url' && videoUrl) {
      const parsed = parseVideoUrl(videoUrl);
      finalVideoUrl = parsed.embedUrl; // Use embed URL with privacy settings
    }

    onSave(title, finalVideoUrl || videoUrl, videoFile);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161922] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Video size={24} />
            Add Video Content
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
            <label className="block text-sm font-bold text-slate-400 mb-3">Upload Method</label>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setUploadMethod('url')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  uploadMethod === 'url'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <LinkIcon size={18} />
                Video URL (YouTube/Vimeo)
              </button>
              <button
                onClick={() => setUploadMethod('file')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  uploadMethod === 'file'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Upload size={18} />
                Upload Video File
              </button>
            </div>

            {uploadMethod === 'url' ? (
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Video URL</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  className="w-full px-4 py-2 bg-[#1a1d26] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-slate-500 mt-2">Supports YouTube and Vimeo URLs</p>
              </div>
            ) : (
              <div>
                <FileUpload
                  type="video"
                  label="Upload Video File"
                  onUploadComplete={(url) => setVideoFile(url)}
                  maxSizeMB={500}
                />
              </div>
            )}
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
              Add Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
