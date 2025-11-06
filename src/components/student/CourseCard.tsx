import Link from 'next/link';
import { Course } from '../../lib/types';

interface CourseCardProps {
  course: Course;
  isLocked: boolean;
  progress?: number;
  onRequestAccess?: () => void;
}

export default function CourseCard({
  course,
  isLocked,
  progress = 0,
  onRequestAccess,
}: CourseCardProps) {
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Thumbnail with Overlay */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Lock Overlay */}
        {isLocked && (
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
        {!isLocked && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 bg-opacity-30">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-4 right-4">
          {!isLocked && (
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
            {course.modules.length} Modules
          </span>
          {course.pricing && (
            <span className="text-lg font-bold text-gray-900">
              ₹{course.pricing.toLocaleString()}
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
        {!isLocked && progress > 0 && (
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
        {isLocked ? (
          <button
            onClick={onRequestAccess}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Request Access
          </button>
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
