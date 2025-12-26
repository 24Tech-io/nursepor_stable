/**
 * Skeleton Loader Components
 * 
 * Provides skeleton loaders for various UI components
 * to show loading states without blocking spinners.
 */

export function CourseCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg overflow-hidden border border-white/10 animate-pulse">
      {/* Thumbnail */}
      <div className="h-52 bg-slate-700/50" />

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-20 bg-slate-700/50 rounded-full" />
          <div className="h-6 w-16 bg-slate-700/50 rounded-full" />
        </div>

        <div className="h-6 w-3/4 bg-slate-700/50 rounded mb-2" />
        <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
        <div className="h-4 w-5/6 bg-slate-700/50 rounded mb-4" />

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
            <div className="h-4 w-12 bg-slate-700/50 rounded" />
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full" />
        </div>

        {/* Button */}
        <div className="h-12 w-full bg-slate-700/50 rounded-xl" />
      </div>
    </div>
  );
}

export function ChapterListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-48 bg-slate-700/50 rounded" />
            <div className="h-8 w-24 bg-slate-700/50 rounded-full" />
          </div>
          <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
          <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-32 bg-slate-700/50 rounded" />
            <div className="h-6 w-16 bg-slate-700/50 rounded" />
          </div>
          <div className="h-2 w-full bg-slate-700/50 rounded-full mb-2" />
          <div className="flex items-center justify-between text-sm">
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg overflow-hidden border border-white/10 animate-pulse">
      <div className="bg-gradient-to-r from-purple-600/50 to-blue-600/50 p-6">
        <div className="h-6 w-32 bg-white/20 rounded mb-4" />
        <div className="h-2 w-full bg-white/20 rounded-full" />
      </div>
      <div className="p-8">
        <div className="h-8 w-full bg-slate-700/50 rounded mb-8" />
        <div className="space-y-3 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 w-full bg-slate-700/50 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="h-10 w-24 bg-slate-700/50 rounded-xl" />
          <div className="h-10 w-24 bg-slate-700/50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-8 bg-slate-700/50 rounded-lg" />
        <div className="h-6 w-16 bg-slate-700/50 rounded" />
      </div>
      <div className="h-8 w-24 bg-slate-700/50 rounded mb-2" />
      <div className="h-4 w-32 bg-slate-700/50 rounded" />
    </div>
  );
}

export function QBankCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse">
      <div className="w-full h-32 bg-slate-700/50 rounded-lg mb-4" />
      <div className="h-6 w-3/4 bg-slate-700/50 rounded mb-2" />
      <div className="h-4 w-full bg-slate-700/50 rounded mb-2" />
      <div className="h-4 w-2/3 bg-slate-700/50 rounded mb-4" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-slate-700/50 rounded" />
        <div className="h-4 w-16 bg-slate-700/50 rounded" />
      </div>
      <div className="h-10 w-full bg-slate-700/50 rounded-lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-white/10">
        <div className="h-6 w-48 bg-slate-700/50 rounded" />
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="h-4 w-32 bg-slate-700/50 rounded" />
            <div className="h-4 w-24 bg-slate-700/50 rounded" />
            <div className="h-4 w-16 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-4 animate-pulse"
        >
          <div className="h-5 w-3/4 bg-slate-700/50 rounded mb-2" />
          <div className="h-4 w-1/2 bg-slate-700/50 rounded" />
        </div>
      ))}
    </div>
  );
}



