"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

export function StockTrackerHeader({
  lastRefresh,
  totalGainers,
  marketOpen,
}: {
  lastRefresh: Date | null;
  totalGainers: number;
  marketOpen: boolean;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          Stock Tracker
        </h1>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            marketOpen
              ? "text-green-600 bg-green-100"
              : "text-gray-500 bg-gray-100"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              marketOpen
                ? "bg-green-500 animate-live-pulse"
                : "bg-gray-400"
            }`}
          />
          {marketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
        </span>
      </div>
      <p className="text-gray-500 text-sm">
        Stocks up 3%+ today across major indices
      </p>
      <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-400">
        {totalGainers > 0 && (
          <span>
            {totalGainers} {totalGainers === 1 ? "Gainer" : "Gainers"} Found
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
