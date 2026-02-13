"use client";

import { useEffect, useState, useCallback } from "react";
import {
  API_VALUE_PICKS_PATH,
  VALUE_PICKS_POLLING_INTERVAL_MS,
} from "@/lib/constants";
import type { ValuePicksData } from "@/lib/types";
import { ValuePickCard } from "./ValuePickCard";
import { ValuePickCardSkeleton } from "./ValuePickCardSkeleton";

export function ValuePicks({
  onClickChart,
}: {
  onClickChart?: (symbol: string) => void;
}) {
  const [data, setData] = useState<ValuePicksData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchValuePicks = useCallback(async () => {
    try {
      const res = await fetch(API_VALUE_PICKS_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ValuePicksData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load value picks"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Separate polling interval (5 minutes, not 5 seconds)
  useEffect(() => {
    fetchValuePicks();
    const interval = setInterval(
      fetchValuePicks,
      VALUE_PICKS_POLLING_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [fetchValuePicks]);

  const hasPicks = data && data.picks.length > 0;

  return (
    <section className="mt-10">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-5 py-3 rounded-t-lg bg-gradient-to-r from-red-600 to-red-700 text-white cursor-pointer ${
          collapsed ? "rounded-b-lg" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Beaten Down Value Picks</h2>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Down 20%+ from 52-week high
          </span>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-sm font-semibold bg-white/25 px-2.5 py-0.5 rounded-full">
              {data.totalQualified} stocks
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-4">
          {/* Loading state */}
          {isLoading && !data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }, (_, i) => (
                <ValuePickCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !data && !isLoading && (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm mb-3">{error}</p>
              <button
                onClick={fetchValuePicks}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {data && data.picks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No stocks currently down 20%+ from their 52-week high
            </div>
          )}

          {/* Value pick cards */}
          {hasPicks && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.picks.map((pick) => (
                  <ValuePickCard
                    key={pick.symbol}
                    pick={pick}
                    onClickChart={onClickChart}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">
                Scanned {data.totalScanned.toLocaleString()} stocks across all
                indices &middot; {data.totalQualified} qualified &middot;
                Showing top {data.picks.length}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
