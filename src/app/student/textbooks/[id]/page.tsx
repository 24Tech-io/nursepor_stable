'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Lazy load PDF viewer to reduce initial bundle size
const SecurePDFViewer = lazy(() => import('@/components/textbook/SecurePDFViewer'));

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

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
}

function TextbookDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const textbookId = params.id as string;
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    // Check for purchase success
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus === 'success') {
      alert('Purchase successful! You can now access the textbook.');
      fetchTextbook();
    }

    fetchTextbook();
    fetchStudentInfo();
  }, [textbookId]);

  const fetchStudentInfo = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStudentEmail(data.user?.email || '');
      }
    } catch (err) {
      console.error('Error fetching student info:', err);
    }
  };

  const fetchTextbook = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/student/textbooks', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch textbooks');
      }

      const data = await response.json();
      const found = data.textbooks?.find((t: Textbook) => t.id === parseInt(textbookId));
      setTextbook(found || null);
    } catch (err) {
      console.error('Error fetching textbook:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      const response = await fetch(`/api/student/textbooks/${textbookId}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.alreadyPurchased) {
        fetchTextbook();
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

  const handleRead = async () => {
    try {
      const response = await fetch(`/api/student/textbooks/${textbookId}/access-token`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      setViewing(true);
    } catch (err: any) {
      alert('Error accessing textbook: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!textbook) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500 mb-4">Textbook not found</p>
          <Link href="/student/textbooks" className="text-blue-600 hover:text-blue-800">
            ← Back to Textbooks
          </Link>
        </div>
      </div>
    );
  }

  if (viewing && accessToken) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF Viewer...</p>
          </div>
        </div>
      }>
        <SecurePDFViewer
          textbookId={parseInt(textbookId)}
          studentEmail={studentEmail}
          accessToken={accessToken}
          onPageChange={(page, total) => {
            // Token expires in 5 minutes, refresh if needed
            if (page % 10 === 0) {
              handleRead(); // Refresh token
            }
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/student/textbooks"
          className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block"
        >
          ← Back to Textbooks
        </Link>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {textbook.thumbnail && (
            <img
              src={textbook.thumbnail}
              alt={textbook.title}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{textbook.title}</h1>
            {textbook.author && (
              <p className="text-lg text-gray-600 mb-4">By {textbook.author}</p>
            )}
            <p className="text-gray-700 mb-6">{textbook.description || 'No description'}</p>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-2xl font-bold text-blue-600">
                  {textbook.currency} {textbook.price.toFixed(2)}
                </span>
                {textbook.totalPages && (
                  <p className="text-sm text-gray-500 mt-1">{textbook.totalPages} pages</p>
                )}
              </div>
            </div>

            {textbook.isPurchased ? (
              <button
                onClick={handleRead}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                Read Textbook
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Purchase Textbook
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TextbookDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TextbookDetailContent />
    </Suspense>
  );
}

