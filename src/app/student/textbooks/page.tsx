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
  totalPages: number | null;
  isPurchased: boolean;
  purchaseDate: string | null;
}

export default function StudentTextbooksPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchased' | 'available'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchTextbooks();
  }, []);

  const fetchTextbooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/student/textbooks', {
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

  const handlePurchase = async (textbookId: number) => {
    try {
      const response = await fetch(`/api/student/textbooks/${textbookId}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.alreadyPurchased) {
        router.push(`/student/textbooks/${textbookId}`);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.message || 'Failed to create checkout');
      }
    } catch (err: any) {
      alert('Error initiating purchase: ' + err.message);
    }
  };

  const filteredTextbooks = filter === 'all'
    ? textbooks
    : filter === 'purchased'
    ? textbooks.filter(t => t.isPurchased)
    : textbooks.filter(t => !t.isPurchased);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Textbooks</h1>
          <p className="text-gray-600 mt-2">Browse and purchase textbooks</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['all', 'purchased', 'available'] as const).map((tab) => (
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

        {/* Textbooks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredTextbooks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No textbooks found.</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{textbook.title}</h3>
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
                  {textbook.isPurchased ? (
                    <Link
                      href={`/student/textbooks/${textbook.id}`}
                      className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Read Now
                    </Link>
                  ) : (
                    <button
                      onClick={() => handlePurchase(textbook.id)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Purchase
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

