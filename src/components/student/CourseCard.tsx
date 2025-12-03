'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Course } from '../../lib/types';
import PaymentButton from './PaymentButton';

function DirectEnrollButton({ 
  courseId, 
  onSuccess,
}: { 
  courseId: string | number; 
  onSuccess?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDirectEnroll = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const courseIdStr = String(courseId);
    
    if (!courseIdStr || courseIdStr === 'undefined' || courseIdStr === 'null') {
      console.error('❌ Invalid course ID:', courseId);
      setError('Invalid course ID. Please try again.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      console.log('📝 Enrolling directly in public course:', courseIdStr);
      
      const response = await fetch('/api/student/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          courseId: courseIdStr,
        }),
      });

      console.log('📡 Direct enrollment response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Direct enrollment failed:', errorData);
        throw new Error(errorData.message || `Failed to enroll (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Direct enrollment successful!', data);
      
      alert('Successfully enrolled! You can now access the course.');
      
      if (onSuccess) {
        onSuccess();
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('❌ Direct enrollment error:', err);
      setError(err.message || 'Failed to enroll. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleDirectEnroll}
        disabled={isLoading}
        className="w-full font-semibold py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Enrolling...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Enroll Now</span>
          </>
        )}
      </button>
    </div>
  );
}

function FreeEnrollButton({ 
  courseId, 
  onSuccess,
  isRequested = false 
}: { 
  courseId: string | number; 
  onSuccess?: () => void;
  isRequested?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(isRequested);
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | null>(
    isRequested ? 'pending' : null
  );

  // Update state when prop changes and check request status
  useEffect(() => {
    setRequestSubmitted(isRequested);
    if (isRequested) {
      checkRequestStatus();
    }
  }, [isRequested]);

  const checkRequestStatus = async () => {
    try {
      const response = await fetch('/api/student/courses', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const course = data.courses?.find((c: any) => c.id === String(courseId));
        if (course) {
          // If enrolled, don't show "Approved" - course is accessible
          if (course.isEnrolled) {
            setRequestStatus(null); // Clear status - course is enrolled
            setRequestSubmitted(false); // Allow access
          } else if (course.hasApprovedRequest) {
            // Approved but not yet enrolled - enrollment sync might be in progress
            setRequestStatus('approved');
            setRequestSubmitted(true);
            // Refresh page to check if enrollment completed
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else if (course.hasPendingRequest) {
            setRequestStatus('pending');
            setRequestSubmitted(true);
          }
        }
      }
    } catch (err) {
      console.error('Error checking request status:', err);
    }
  };

  const handleRequestAccess = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ensure courseId is a string
    const courseIdStr = String(courseId);
    
    if (!courseIdStr || courseIdStr === 'undefined' || courseIdStr === 'null') {
      console.error('❌ Invalid course ID:', courseId);
      setError('Invalid course ID. Please try again.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      console.log('📝 Sending access request for course:', courseIdStr);
      
      const response = await fetch('/api/student/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          courseId: courseIdStr,
          reason: 'Requesting access to this free course'
        }),
      });

      console.log('📡 Access request response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Access request failed:', errorData);
        throw new Error(errorData.message || `Failed to submit request (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Access request submitted successfully!', data);

      // Update button state to show "Requested"
      setRequestSubmitted(true);
      
      // Show success message
      alert('Access request submitted! An admin will review your request and you will be notified once it\'s approved.');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Don't reload - just update the UI
      setIsLoading(false);
    } catch (err: any) {
      console.error('❌ Access request error:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleRequestAccess}
        disabled={isLoading || requestSubmitted}
        className={`w-full font-semibold py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
          requestSubmitted
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Submitting Request...</span>
          </>
        ) : requestSubmitted ? (
          requestStatus === 'approved' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Approved</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Requested</span>
            </>
          )
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Request Access</span>
          </>
        )}
      </button>
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  isLocked: boolean;
  progress?: number;
  onRequestAccess?: () => void;
  userId?: string | number;
  hasPendingRequest?: boolean;
  hasApprovedRequest?: boolean;
  isPublic?: boolean;
}

export default function CourseCard({
  course,
  isLocked,
  progress = 0,
  onRequestAccess,
  userId,
  hasPendingRequest = false,
  hasApprovedRequest = false,
  isPublic = false,
}: CourseCardProps) {
  // Use course props if available, otherwise use passed props
  const finalHasPendingRequest = course.hasPendingRequest ?? hasPendingRequest;
  const finalHasApprovedRequest = course.hasApprovedRequest ?? hasApprovedRequest;
  const finalIsPublic = course.isPublic ?? isPublic;
  const finalIsEnrolled = course.isEnrolled ?? !isLocked;
  
  // CRITICAL FIX: Only unlock if actually enrolled, not just approved request
  // Approved requests should be synced by API to create enrollments
  // If sync succeeded, finalIsEnrolled will be true
  const shouldBeUnlocked = finalIsEnrolled;
  const finalIsLocked = !shouldBeUnlocked;
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Thumbnail with Overlay */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Lock Overlay */}
        {finalIsLocked && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-sm">Locked</p>
            </div>
          </div>
        )}

        {/* Progress Bar (for unlocked courses) */}
        {!finalIsLocked && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 bg-opacity-30">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-4 right-4">
          {!finalIsLocked && (
            <span className="px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
              UNLOCKED
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            {course.modules?.length || 0} Modules
          </span>
          {course.pricing !== undefined && course.pricing !== null && (
            <span className="text-lg font-bold text-gray-900">
              {course.pricing === 0 ? 'Free' : `₹${course.pricing.toLocaleString()}`}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
          {course.title}
        </h3>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        {/* Progress Info */}
        {!finalIsLocked && progress > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-900">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {finalIsLocked ? (
          course.pricing && course.pricing > 0 ? (
            <PaymentButton
              courseId={course.id}
              courseTitle={course.title}
              price={course.pricing}
              userId={userId || '1'}
            />
          ) : isPublic ? (
            <DirectEnrollButton
              courseId={course.id}
              onSuccess={() => {
                // Enrollment successful - refresh page or update state
                console.log('✅ Direct enrollment successful callback triggered');
                if (onRequestAccess) {
                  onRequestAccess();
                } else {
                  window.location.reload();
                }
              }}
            />
          ) : (
            <FreeEnrollButton
              courseId={course.id}
              isRequested={finalHasPendingRequest && !finalHasApprovedRequest}
              onSuccess={() => {
                // Request submitted - button will update to "Requested"
                console.log('✅ Request submitted callback triggered');
                if (onRequestAccess) {
                  onRequestAccess();
                }
              }}
            />
          )
        ) : (
          <Link href={`/student/courses/${course.id}`}>
            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center space-x-2">
              <span>{progress > 0 ? 'Continue Learning' : 'Start Learning'}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
