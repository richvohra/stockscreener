export function StockCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded mt-1.5" />
        </div>
        <div className="text-right">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-12 bg-gray-100 rounded mt-1.5 ml-auto" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="h-3 w-20 bg-gray-100 rounded" />
        <div className="h-3 w-14 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
