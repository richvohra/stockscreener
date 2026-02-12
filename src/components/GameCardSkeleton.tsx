export function GameCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse">
      {/* Status badge */}
      <div className="h-5 w-20 bg-zinc-800 rounded-full mb-3" />

      {/* Away team */}
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 bg-zinc-800 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="h-4 w-28 bg-zinc-800 rounded" />
          <div className="h-3 w-12 bg-zinc-800 rounded mt-1" />
        </div>
        <div className="h-7 w-10 bg-zinc-800 rounded" />
      </div>

      {/* Home team */}
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 bg-zinc-800 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="h-4 w-32 bg-zinc-800 rounded" />
          <div className="h-3 w-12 bg-zinc-800 rounded mt-1" />
        </div>
        <div className="h-7 w-10 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
