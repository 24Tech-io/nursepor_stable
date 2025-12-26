'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Textbook {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  price: number;
  currency: string;
  thumbnail: string | null;
  status: string;
  totalPages: number | null;
  fileSize: number | null;
  createdAt: string;
}

export default function AdminTextbooksPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchTextbooks();
  }, [filter]);

  const fetchTextbooks = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/admin/textbooks'
        : `/api/admin/textbooks?status=${filter}`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch textbooks');
      }

      const data = await response.json();
      setTextbooks(data.textbooks || []);
    } catch (err) {
      console.error('Error fetching textbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this textbook?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/textbooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete textbook');
      }

      fetchTextbooks();
    } catch (err: any) {
      alert('Error deleting textbook: ' + err.message);
    }
  };

  const filteredTextbooks = filter === 'all' 
    ? textbooks 
    : textbooks.filter(t => t.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Textbooks</h1>
            <p className="text-gray-600 mt-2">Manage purchasable textbooks</p>
          </div>
          <Link
            href="/admin/textbooks/create"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Create Textbook
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['all', 'draft', 'published', 'archived'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Textbooks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredTextbooks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No {filter === 'all' ? '' : filter} textbooks found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTextbooks.map((textbook) => (
              <div key={textbook.id} className="bg-white rounded-lg shadow overflow-hidden">
                {textbook.thumbnail && (
                  <img
                    src={textbook.thumbnail}
                    alt={textbook.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{textbook.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        textbook.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : textbook.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {textbook.status}
                    </span>
                  </div>
                  {textbook.author && (
                    <p className="text-sm text-gray-600 mb-2">By {textbook.author}</p>
                  )}
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {textbook.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-blue-600">
                      {textbook.currency} {textbook.price.toFixed(2)}
                    </span>
                    {textbook.totalPages && (
                      <span className="text-sm text-gray-500">{textbook.totalPages} pages</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/textbooks/${textbook.id}/edit`)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(textbook.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

