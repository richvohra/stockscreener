"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { ConferenceStandingsData, StandingsTeam } from "@/lib/types";

function StandingsTable({
  title,
  teams,
  accent,
}: {
  title: string;
  teams: StandingsTeam[];
  accent: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-1.5 h-5 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          {title}
        </h3>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-2 items-center text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 pb-1.5 border-b border-gray-200">
        <span className="w-5 text-center">#</span>
        <span>Team</span>
        <span className="w-12 text-center">W-L</span>
        <span className="w-8 text-center">GB</span>
        <span className="w-10 text-center">STRK</span>
        <span className="w-14 text-center hidden sm:block">CONF</span>
        <span className="w-12 text-center hidden sm:block">L10</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {teams.map((team) => {
          const isPlayoff = team.rank <= 6;
          const isPlayIn = team.rank >= 7 && team.rank <= 10;

          return (
            <div
              key={team.abbreviation}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-2 items-center px-2 py-1.5 text-xs transition-colors hover:bg-gray-50 ${
                isPlayoff
                  ? ""
                  : isPlayIn
                  ? "opacity-80"
                  : "opacity-50"
              }`}
            >
              <span className="w-5 text-center text-gray-400 font-bold tabular-nums text-[11px]">
                {team.rank}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src={team.logo}
                  alt={team.abbreviation}
                  width={20}
                  height={20}
                  className="shrink-0"
                />
                <span className="font-semibold text-gray-800 truncate hidden sm:inline">
                  {team.displayName}
                </span>
                <span className="font-semibold text-gray-800 sm:hidden">
                  {team.abbreviation}
                </span>
              </div>
              <span className="w-12 text-center font-bold text-gray-900 tabular-nums">
                {team.wins}-{team.losses}
              </span>
              <span className="w-8 text-center text-gray-400 tabular-nums">
                {team.gamesBehind === "-" ? "—" : team.gamesBehind}
              </span>
              <span
                className={`w-10 text-center font-medium tabular-nums ${
                  team.streak.startsWith("W")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {team.streak}
              </span>
              <span className="w-14 text-center text-gray-400 tabular-nums hidden sm:block">
                {team.confRecord}
              </span>
              <span className="w-12 text-center text-gray-400 tabular-nums hidden sm:block">
                {team.lastTen}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-600" />
          Playoff
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          Play-In
        </span>
      </div>
    </div>
  );
}

function StandingsSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {[0, 1].map((i) => (
        <div key={i} className="flex-1 animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 15 }, (_, j) => (
              <div key={j} className="flex items-center gap-2 px-2">
                <div className="w-5 h-4 bg-gray-200 rounded" />
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
                <div className="h-4 flex-1 bg-gray-200 rounded" />
                <div className="w-10 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConferenceStandings() {
  const [data, setData] = useState<ConferenceStandingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStandings = useCallback(async () => {
    try {
      const res = await fetch("/api/standings", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ConferenceStandingsData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load standings"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
    // Refresh standings every 5 minutes
    const interval = setInterval(fetchStandings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStandings]);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">
        Conference Standings
      </h2>
      <p className="text-sm text-gray-400 mb-6 text-center">
        2025-26 NBA Regular Season
      </p>

      {isLoading && <StandingsSkeleton />}

      {error && !data && !isLoading && (
        <div className="text-center py-8">
          <p className="text-red-600 text-sm mb-3">
            Failed to load standings
          </p>
          <button
            onClick={fetchStandings}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {data && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8">
            <StandingsTable
              title="Eastern Conference"
              teams={data.east}
              accent="#3b82f6"
            />
            <div className="hidden lg:block w-px bg-gray-200 shrink-0" />
            <div className="lg:hidden h-px bg-gray-200" />
            <StandingsTable
              title="Western Conference"
              teams={data.west}
              accent="#ef4444"
            />
          </div>
        </div>
      )}
    </section>
  );
}
