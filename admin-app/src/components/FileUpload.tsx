'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, File, Image as ImageIcon, Video, FileText, Loader2 } from 'lucide-react';

interface FileUploadProps {
  type: 'thumbnail' | 'video' | 'document';
  onUploadComplete: (url: string, fileName: string) => void;
  currentUrl?: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

export default function FileUpload({
  type,
  onUploadComplete,
  currentUrl,
  accept,
  maxSizeMB = 10,
  label,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDefaultAccept = () => {
    switch (type) {
      case 'thumbnail':
        return 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
      case 'video':
        return 'video/mp4,video/webm,video/ogg,video/quicktime';
      case 'document':
        return 'application/pdf,.ppt,.pptx,.doc,.docx';
      default:
        return '*/*';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'thumbnail':
        return <ImageIcon size={20} />;
      case 'video':
        return <Video size={20} />;
      case 'document':
        return <FileText size={20} />;
      default:
        return <File size={20} />;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }

    // Create preview for images
    if (type === 'thumbnail' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Upload failed');
      }

      const data = await response.json();
      setUploadProgress(100);
      onUploadComplete(data.url, data.fileName);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setPreview(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-bold text-slate-400 mb-1">{label}</label>}

      <div className="relative">
        {preview && type === 'thumbnail' ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border border-slate-800"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${
                isUploading
                  ? 'border-purple-500 bg-purple-500/10'
                  : preview
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-slate-700 hover:border-purple-500 hover:bg-slate-800/50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept || getDefaultAccept()}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-purple-400" size={24} />
                <p className="text-sm text-slate-400">Uploading... {uploadProgress}%</p>
              </div>
            ) : preview ? (
              <div className="flex flex-col items-center gap-2">
                {getIcon()}
                <p className="text-sm text-slate-300">{preview}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {getIcon()}
                <p className="text-sm text-slate-400">
                  Click to upload{' '}
                  {type === 'thumbnail' ? 'image' : type === 'video' ? 'video' : 'document'}
                </p>
                <p className="text-xs text-slate-500">Max size: {maxSizeMB}MB</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
