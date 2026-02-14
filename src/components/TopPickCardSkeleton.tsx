export function TopPickCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="h-5 w-16 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded mt-1.5" />
            </div>
            <div className="text-right">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-3 w-12 bg-gray-100 rounded mt-1.5 ml-auto" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 w-full bg-gray-100 rounded-full" />
      </div>
      <div className="mt-2.5 grid grid-cols-6 gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <div className="h-1 bg-gray-100 rounded-full" />
            <div className="h-2 w-8 bg-gray-50 rounded mt-0.5 mx-auto" />
          </div>
        ))}
      </div>
      <div className="mt-2 h-3 w-full bg-gray-100 rounded" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <div className="h-3 w-14 bg-gray-100 rounded mb-1" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-2">
        <div className="h-3 w-40 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
