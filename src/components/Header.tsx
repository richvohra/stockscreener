"use client";

import { useEffect, useState } from "react";
import { timeAgo, formatDate } from "@/lib/utils";

export function Header({
  date,
  lastRefresh,
  gamesCount,
  hasLiveGames,
}: {
  date: string | null;
  lastRefresh: Date | null;
  gamesCount: number;
  hasLiveGames: boolean;
}) {
  const [, setTick] = useState(0);

  // Update "X ago" display every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          NBA Scores
        </h1>
        {hasLiveGames && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-live-pulse" />
            LIVE
          </span>
        )}
      </div>
      {date && (
        <p className="text-gray-500 text-sm">{formatDate(date)}</p>
      )}
      <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-400">
        {gamesCount > 0 && (
          <span>
            {gamesCount} {gamesCount === 1 ? "Game" : "Games"} Today
          </span>
        )}
        {lastRefresh && (
          <>
            <span className="text-gray-300">|</span>
            <span>Updated {timeAgo(lastRefresh)}</span>
          </>
        )}
      </div>
    </header>
  );
}
