'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/common/Toast';

interface CourseReviewsProps {
  courseId: number;
}

export default function CourseReviews({ courseId }: CourseReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`);
      const data = await response.json();
      setReviews(data.reviews || []);
      setSummary(data.summary || null);
    } catch (error) {
      showError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      showError('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review: reviewText }),
      });

      if (response.ok) {
        showSuccess('Review submitted successfully!');
        setShowReviewForm(false);
        setRating(0);
        setReviewText('');
        fetchReviews();
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to submit review');
      }
    } catch (error) {
      showError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive: boolean = false) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          >
            <svg
              className={`w-6 h-6 ${
                star <= (interactive ? hoverRating || rating : count)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {summary && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-start space-x-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">{summary.averageRating}</div>
              {renderStars(Math.round(parseFloat(summary.averageRating)))}
              <p className="text-sm text-gray-600 mt-2">{summary.totalReviews} reviews</p>
            </div>

            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-12">{star} star</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{
                        width: `${summary.totalReviews > 0 ? (summary.ratingDistribution[star] / summary.totalReviews) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12">
                    {summary.ratingDistribution[star]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="mt-6 w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Leave a Review
          </button>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white rounded-xl p-6 shadow-md animate-[fadeInDown_0.3s_ease-out]">
          <h3 className="text-xl font-bold mb-4">Write a Review</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
              {renderStars(rating, true)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                rows={4}
                placeholder="Share your experience with this course..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={submitReview}
                disabled={submitting || rating === 0}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                onClick={() => setShowReviewForm(false)}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl p-6 shadow-md hover-lift">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {review.user.profilePicture ? (
                  <img
                    src={review.user.profilePicture}
                    alt={review.user.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-lg">
                      {review.user.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{review.user.name}</h4>
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {review.review && <p className="text-gray-700 mt-2">{review.review}</p>}

                <button className="mt-3 text-sm text-gray-600 hover:text-purple-600 transition-colors">
                  Helpful ({review.helpful})
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
