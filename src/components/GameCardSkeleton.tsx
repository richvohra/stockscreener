export function GameCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse shadow-sm">
      {/* Status badge */}
      <div className="h-5 w-20 bg-gray-200 rounded-full mb-3" />

      {/* Away team */}
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded mt-1" />
        </div>
        <div className="h-7 w-10 bg-gray-200 rounded" />
      </div>

      {/* Home team */}
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded mt-1" />
        </div>
        <div className="h-7 w-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
