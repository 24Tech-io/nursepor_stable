'use client';

import { Share2, Facebook, Twitter, Linkedin, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface BlogShareProps {
  title: string;
  slug: string;
}

export default function BlogShare({ title, slug }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/student/blogs/${slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'text-blue-600 hover:bg-blue-50',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'text-sky-500 hover:bg-sky-50',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'text-blue-700 hover:bg-blue-50',
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-semibold hover:bg-purple-200 transition"
      >
        <Share2 size={18} />
        Share
      </button>

      {showShareMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 z-20 p-4">
            <h3 className="font-bold text-gray-900 mb-3">Share this blog</h3>

            <div className="space-y-2">
              {shareLinks.map(({ name, icon: Icon, url, color }) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3 rounded-xl transition ${color}`}
                >
                  <Icon size={20} />
                  <span className="font-semibold text-sm">{name}</span>
                </a>
              ))}

              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-gray-100 transition"
              >
                {copied ? (
                  <>
                    <Check size={20} className="text-green-600" />
                    <span className="font-semibold text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    <span className="font-semibold text-sm">Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
