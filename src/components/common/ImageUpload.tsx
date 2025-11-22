'use client';

import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    currentImage?: string | null;
    onImageUploaded: (url: string) => void;
    label?: string;
}

export default function ImageUpload({ currentImage, onImageUploaded, label = 'Upload Image' }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setError(null);
        setIsUploading(true);

        try {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to server
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                onImageUploaded(data.url);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Upload failed');
                setPreview(currentImage || null);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload image');
            setPreview(currentImage || null);
        } finally {
            setIsUploading(false);
        }
    };

    const clearImage = () => {
        setPreview(null);
        onImageUploaded('');
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">{label}</label>

            {preview ? (
                <div className="relative">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                    />
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                        type="button"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mb-3 text-gray-400 group-hover:text-purple-500 transition" />
                                <p className="mb-2 text-sm text-gray-600 group-hover:text-purple-600">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
                            </>
                        )}
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                </label>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                    <X size={16} />
                    {error}
                </p>
            )}
        </div>
    );
}
