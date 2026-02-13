"use client";

import { useEffect, useState, useCallback } from "react";
import { STOCK_POLLING_INTERVAL_MS, API_STOCKS_PATH } from "@/lib/constants";
import type { StockTrackerData } from "@/lib/types";
import { StockTrackerHeader } from "./StockTrackerHeader";
import { IndexSection } from "./IndexSection";
import { StockCardSkeleton } from "./StockCardSkeleton";

export function StockTracker() {
  const [data, setData] = useState<StockTrackerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch(API_STOCKS_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StockTrackerData = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load stock data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling every 5 seconds
  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, STOCK_POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  // Pause polling when tab is hidden, fetch immediately when visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStocks();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchStocks]);

  const totalGainers =
    data?.indices.reduce((sum, idx) => sum + idx.stocks.length, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <StockTrackerHeader
        lastRefresh={lastRefresh}
        totalGainers={totalGainers}
        marketOpen={data?.marketOpen ?? false}
      />

      {/* Error banner (shown with stale data) */}
      {error && data && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
          Connection lost — showing cached data
        </div>
      )}

      {/* Error state (no data at all) */}
      {error && !data && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-600 text-lg mb-4">
            Failed to load stock data
          </p>
          <button
            onClick={fetchStocks}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && !data && (
        <div className="space-y-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <div className="h-12 bg-gray-200 rounded-t-lg animate-pulse" />
              <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }, (_, j) => (
                    <StockCardSkeleton key={j} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Index sections */}
      {data && (
        <div>
          {data.indices.map((index) => (
            <IndexSection key={index.name} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
