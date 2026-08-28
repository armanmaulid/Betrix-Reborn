/**
 * Route transition skeleton for every page under (dashboard).
 *
 * The app router renders this inside the DashboardShell's <main> while a page
 * segment is suspended — before the client container mounts and its TanStack
 * Query data arrives. It mirrors the house layout (PageHeader → FilterBar →
 * table → pagination) so navigation never flashes a blank screen.
 *
 * Pure presentational markup using only design tokens (bg-border etc.) — kept
 * separate so the theme compliance test stays green.
 */

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`bg-border animate-pulse ${className ?? ''}`} />;
}

function PageHeaderSkeleton() {
  return (
    <div className="border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <SkeletonLine className="w-4 h-4" />
          <SkeletonLine className="h-4 w-44" />
        </div>
        <SkeletonLine className="h-3 w-72 max-w-full" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonLine className="h-8 w-24" />
        <SkeletonLine className="h-8 w-32" />
      </div>
    </div>
  );
}

function StatCardGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-border bg-surface p-3 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3.5 w-3.5" />
          </div>
          <SkeletonLine className="h-6 w-14" />
          <SkeletonLine className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="border border-border bg-surface p-3 flex items-center justify-between gap-3">
      <SkeletonLine className="h-6 w-56 max-w-full" />
      <SkeletonLine className="h-4 w-32" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="border border-border bg-surface overflow-x-auto">
      {/* Header row */}
      <div className="flex items-center gap-8 border-b border-border bg-black/80 px-3 py-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} className="h-3 w-24" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-8 px-3 py-3 border-b border-border/60">
          <SkeletonLine className="h-3 w-40" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <SkeletonLine className="h-4 w-44" />
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} className="h-6 w-7" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-3 font-mono" aria-busy="true" aria-label="Loading page">
      <PageHeaderSkeleton />
      <StatCardGrid />
      <FilterBarSkeleton />
      <TableSkeleton />
      <PaginationSkeleton />
    </div>
  );
}
