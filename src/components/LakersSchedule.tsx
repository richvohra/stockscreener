"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { TeamScheduleData, ScheduleGame } from "@/lib/types";

function formatGameDate(isoDate: string): { dayOfWeek: string; date: string; time: string } {
  const d = new Date(isoDate);
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return { dayOfWeek, date, time };
}

function ScheduleRow({ game }: { game: ScheduleGame }) {
  const { dayOfWeek, date, time } = formatGameDate(game.date);
  const isHome = game.homeAway === "home";

  return (
    <div className="flex items-center gap-3 py-3 px-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* Date column */}
      <div className="w-12 shrink-0 text-center">
        <p className="text-xs font-bold text-gray-900 leading-tight">{dayOfWeek}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{date}</p>
      </div>

      {/* Opponent */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Image
          src={game.opponent.logo}
          alt={game.opponent.abbreviation}
          width={28}
          height={28}
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            <span className="text-gray-400 text-xs mr-1">
              {isHome ? "vs" : "@"}
            </span>
            {game.opponent.displayName}
          </p>
          <p className="text-[10px] text-gray-400 truncate">{time}</p>
        </div>
      </div>

      {/* Broadcast badge */}
      {game.broadcast && (
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
          {game.broadcast}
        </span>
      )}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-gray-100">
          <div className="w-12 shrink-0 flex flex-col items-center gap-1">
            <div className="h-3 w-8 bg-gray-200 rounded" />
            <div className="h-2.5 w-10 bg-gray-100 rounded" />
          </div>
          <div className="w-7 h-7 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-2.5 w-20 bg-gray-100 rounded mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LakersSchedule() {
  const [data, setData] = useState<TeamScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/lakers-schedule", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TeamScheduleData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load schedule"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, #552583 0%, #FDB927 100%)",
        }}
      >
        {data?.teamLogo && (
          <Image
            src={data.teamLogo}
            alt={data.teamAbbreviation}
            width={32}
            height={32}
            className="shrink-0"
          />
        )}
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">
            {data?.teamName ?? "Los Angeles Lakers"}
          </h3>
          <p className="text-[10px] text-white/70 font-medium">
            Next 5 Games
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading && <ScheduleSkeleton />}

      {error && !data && !isLoading && (
        <div className="text-center py-6 px-3">
          <p className="text-red-600 text-xs mb-2">Failed to load schedule</p>
          <button
            onClick={fetchSchedule}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {data && data.games.length === 0 && (
        <div className="text-center py-6 px-3">
          <p className="text-gray-400 text-xs">No upcoming games scheduled</p>
        </div>
      )}

      {data && data.games.length > 0 && (
        <div>
          {data.games.map((game) => (
            <ScheduleRow key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
