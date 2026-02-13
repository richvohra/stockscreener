"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { LeagueLeadersData, LeagueLeaderEntry } from "@/lib/types";

function LeaderEntry({ entry }: { entry: LeagueLeaderEntry }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="text-gray-400 text-xs font-bold w-4 text-right tabular-nums">
        {entry.rank}
      </span>
      <Image
        src={entry.headshot}
        alt={entry.playerName}
        width={32}
        height={32}
        className="rounded-full border-2 border-gray-200 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate leading-tight">
          {entry.playerName}
        </p>
        <p
          className="text-xs leading-tight font-medium"
          style={{ color: `#${entry.teamColor}` }}
        >
          {entry.teamAbbreviation}
        </p>
      </div>
      <span className="text-sm font-bold text-gray-900 tabular-nums">
        {entry.value}
      </span>
    </div>
  );
}

function ConferenceColumn({
  title,
  entries,
  accent,
}: {
  title: string;
  entries: LeagueLeaderEntry[];
  accent: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-1 h-4 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {title}
        </h4>
      </div>
      <div className="space-y-0.5">
        {entries.map((entry) => (
          <LeaderEntry key={`${entry.playerName}-${entry.rank}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function LeaderCategoryCard({
  displayName,
  abbreviation,
  east,
  west,
}: {
  displayName: string;
  abbreviation: string;
  east: LeagueLeaderEntry[];
  west: LeagueLeaderEntry[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-bold text-gray-900">{displayName}</span>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {abbreviation}
        </span>
      </div>
      <div className="flex gap-6">
        <ConferenceColumn
          title="Eastern Conference"
          entries={east}
          accent="#3b82f6"
        />
        <div className="w-px bg-gray-200 shrink-0" />
        <ConferenceColumn
          title="Western Conference"
          entries={west}
          accent="#ef4444"
        />
      </div>
    </div>
  );
}

function LeadersSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse shadow-sm"
        >
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="flex gap-6">
            {[0, 1].map((j) => (
              <div key={j} className="flex-1 space-y-3">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                {[0, 1, 2, 3, 4].map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-8 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeagueLeaders() {
  const [data, setData] = useState<LeagueLeadersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaders = useCallback(async () => {
    try {
      const res = await fetch("/api/leaders", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LeagueLeadersData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaders"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaders();
    // Refresh leaders every 5 minutes (stat leaders don't change often)
    const interval = setInterval(fetchLeaders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLeaders]);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">
        NBA Season Leaders
      </h2>
      <p className="text-sm text-gray-400 mb-6 text-center">
        Top 5 by conference — Points, Rebounds &amp; Assists per game
      </p>

      {isLoading && <LeadersSkeleton />}

      {error && !data && !isLoading && (
        <div className="text-center py-8">
          <p className="text-red-600 text-sm mb-3">Failed to load leaders</p>
          <button
            onClick={fetchLeaders}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {data.categories.map((cat) => (
            <LeaderCategoryCard
              key={cat.category}
              displayName={cat.displayName}
              abbreviation={cat.abbreviation}
              east={cat.east}
              west={cat.west}
            />
          ))}
        </div>
      )}
    </section>
  );
}
