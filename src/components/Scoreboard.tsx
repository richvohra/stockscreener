"use client";

import { useEffect, useState, useCallback } from "react";
import { POLLING_INTERVAL_MS, API_SCORES_PATH } from "@/lib/constants";
import type { ScoreboardData } from "@/lib/types";
import { GameCard } from "./GameCard";
import { GameCardSkeleton } from "./GameCardSkeleton";
import { Header } from "./Header";
import { NoGames } from "./NoGames";
import { LeagueLeaders } from "./LeagueLeaders";
import { ConferenceStandings } from "./ConferenceStandings";
import { BoxScore } from "./BoxScore";
import { LakersSchedule } from "./LakersSchedule";

export function Scoreboard() {
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [boxScoreGameId, setBoxScoreGameId] = useState<string | null>(null);

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Header
        date={data?.date ?? null}
        lastRefresh={lastRefresh}
        gamesCount={data?.games.length ?? 0}
        hasLiveGames={hasLiveGames}
      />

      {/* Error banner (shown with stale data) */}
      {error && data && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
          Connection lost — showing cached scores
        </div>
      )}

      {/* Error state (no data at all) */}
      {error && !data && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-600 text-lg mb-4">Failed to load scores</p>
          <button
            onClick={fetchScores}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main content area with sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Game cards */}
        <div className="flex-1 min-w-0">
          {/* Loading skeletons */}
          {isLoading && !data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {data && data.games.length === 0 && <NoGames />}

          {/* Game cards */}
          {data && data.games.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onClickBoxScore={setBoxScoreGameId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Lakers Schedule sidebar */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <div className="lg:sticky lg:top-8">
            <LakersSchedule />
          </div>
        </div>
      </div>

      {/* Conference Standings */}
      <ConferenceStandings />

      {/* League Leaders by Conference */}
      <LeagueLeaders />

      {/* Box Score Modal */}
      {boxScoreGameId && (
        <BoxScore
          gameId={boxScoreGameId}
          onClose={() => setBoxScoreGameId(null)}
        />
      )}
    </div>
  );
}
