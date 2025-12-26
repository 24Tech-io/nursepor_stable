/**
 * Loading Skeleton Components
 * Provides visual feedback while data is loading
 * Improves perceived performance by showing instant UI
 */

export const StatCardSkeleton = () => (
  <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6 animate-pulse">
    <div className="h-4 bg-slate-700/50 rounded w-24 mb-3"></div>
    <div className="h-8 bg-slate-700/50 rounded w-16 mb-2"></div>
    <div className="h-3 bg-slate-700/50 rounded w-32"></div>
  </div>
);

export const ActivityLogSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 bg-[#161922] rounded-lg border border-slate-800/60">
        <div className="w-8 h-8 bg-slate-700/50 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-700/50 rounded w-3/4"></div>
          <div className="h-2 bg-slate-700/50 rounded w-1/2"></div>
        </div>
        <div className="h-2 bg-slate-700/50 rounded w-16"></div>
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden">
    <div className="grid gap-4 p-4 animate-pulse">
      {/* Header */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-700/50 rounded"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-8 bg-slate-700/30 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="bg-[#161922] border border-slate-800/60 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-700/50"></div>
    <div className="p-4 space-y-3">
      <div className="h-6 bg-slate-700/50 rounded w-3/4"></div>
      <div className="h-4 bg-slate-700/30 rounded w-full"></div>
      <div className="h-4 bg-slate-700/30 rounded w-5/6"></div>
      <div className="flex gap-2 mt-4">
        <div className="h-8 bg-slate-700/50 rounded flex-1"></div>
        <div className="h-8 bg-slate-700/50 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export const QuestionRowSkeleton = () => (
  <div className="grid grid-cols-12 p-3 rounded-lg bg-[#1a1d26] border border-slate-800/60 animate-pulse">
    <div className="col-span-1 h-4 bg-slate-700/50 rounded"></div>
    <div className="col-span-4 h-4 bg-slate-700/50 rounded"></div>
    <div className="col-span-2 h-4 bg-slate-700/50 rounded"></div>
    <div className="col-span-2 h-4 bg-slate-700/50 rounded"></div>
    <div className="col-span-1 h-4 bg-slate-700/50 rounded"></div>
    <div className="col-span-2 h-8 bg-slate-700/50 rounded"></div>
  </div>
);

export const ModuleSkeleton = () => (
  <div className="bg-[#161922] border border-slate-800/60 rounded-xl overflow-hidden animate-pulse">
    <div className="p-4 bg-[#1a1d26] border-b border-slate-800/60">
      <div className="h-6 bg-slate-700/50 rounded w-48"></div>
    </div>
    <div className="p-4 space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center p-3 bg-[#13151d] border border-slate-800/50 rounded-lg">
          <div className="w-8 h-8 bg-slate-700/50 rounded-lg mr-3"></div>
          <div className="flex-1 h-4 bg-slate-700/50 rounded"></div>
          <div className="w-16 h-8 bg-slate-700/50 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

