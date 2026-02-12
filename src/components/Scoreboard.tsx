"use client";

import { useEffect, useState, useCallback } from "react";
import { POLLING_INTERVAL_MS, API_SCORES_PATH } from "@/lib/constants";
import type { ScoreboardData } from "@/lib/types";
import { GameCard } from "./GameCard";
import { GameCardSkeleton } from "./GameCardSkeleton";
import { Header } from "./Header";
import { NoGames } from "./NoGames";

export function Scoreboard() {
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(API_SCORES_PATH, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ScoreboardData = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load scores"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling
  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchScores]);

  // Pause polling when tab is hidden, fetch immediately when visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchScores();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchScores]);

  const hasLiveGames = data?.games.some((g) => g.state === "in") ?? false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Header
        date={data?.date ?? null}
        lastRefresh={lastRefresh}
        gamesCount={data?.games.length ?? 0}
        hasLiveGames={hasLiveGames}
      />

      {/* Error banner (shown with stale data) */}
      {error && data && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg text-center">
          Connection lost — showing cached scores
        </div>
      )}

      {/* Error state (no data at all) */}
      {error && !data && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-400 text-lg mb-4">Failed to load scores</p>
          <button
            onClick={fetchScores}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.games.length === 0 && <NoGames />}

      {/* Game cards */}
      {data && data.games.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
