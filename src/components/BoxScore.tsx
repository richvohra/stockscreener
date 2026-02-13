"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { BoxScoreData, BoxScoreTeam, BoxScorePlayer } from "@/lib/types";
import { PlayByPlay } from "./PlayByPlay";

type Tab = "boxscore" | "playbyplay";

// Highlight columns for key stats (PTS, REB, AST)
const HIGHLIGHT_LABELS = new Set(["PTS", "REB", "AST"]);

function PlayerRow({
  player,
  labels,
  isEven,
}: {
  player: BoxScorePlayer;
  labels: string[];
  isEven: boolean;
}) {
  if (player.didNotPlay) {
    return (
      <tr className={isEven ? "bg-gray-50" : ""}>
        <td className="sticky left-0 z-10 bg-inherit py-1.5 px-2">
          <div className="flex items-center gap-2">
            <Image
              src={player.headshot}
              alt={player.shortName}
              width={24}
              height={24}
              className="rounded-full shrink-0 opacity-40"
            />
            <div className="min-w-0">
              <span className="text-gray-400 text-xs truncate block">
                {player.shortName}
              </span>
              <span className="text-gray-300 text-[10px]">
                {player.position}
              </span>
            </div>
          </div>
        </td>
        <td
          colSpan={labels.length}
          className="text-center text-gray-400 text-xs italic py-1.5"
        >
          DNP
        </td>
      </tr>
    );
  }

  return (
    <tr className={`${isEven ? "bg-gray-50" : ""} hover:bg-gray-100 transition-colors`}>
      <td className="sticky left-0 z-10 py-1.5 px-2" style={{ background: "inherit" }}>
        <div className="flex items-center gap-2 min-w-[140px]" style={{ backgroundColor: isEven ? "#f9fafb" : "#ffffff" }}>
          <Image
            src={player.headshot}
            alt={player.shortName}
            width={24}
            height={24}
            className="rounded-full shrink-0"
          />
          <div className="min-w-0">
            <span className="text-gray-800 text-xs font-medium truncate block leading-tight">
              {player.shortName}
            </span>
            <span className="text-gray-400 text-[10px] leading-tight">
              {player.position} #{player.jersey}
            </span>
          </div>
        </div>
      </td>
      {player.stats.map((val, i) => {
        const isHighlight = HIGHLIGHT_LABELS.has(labels[i]);
        return (
          <td
            key={i}
            className={`text-center py-1.5 px-1.5 tabular-nums text-xs whitespace-nowrap ${
              isHighlight
                ? "text-gray-900 font-semibold"
                : "text-gray-500"
            }`}
          >
            {val}
          </td>
        );
      })}
    </tr>
  );
}

function TeamBoxScore({
  team,
  labels,
}: {
  team: BoxScoreTeam;
  labels: string[];
}) {
  const starters = team.players.filter((p) => p.starter);
  const bench = team.players.filter((p) => !p.starter && !p.didNotPlay);
  const dnp = team.players.filter((p) => p.didNotPlay);

  return (
    <div className="mb-8">
      {/* Team header */}
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={team.logo}
          alt={team.abbreviation}
          width={28}
          height={28}
        />
        <h3 className="text-base font-bold text-gray-900">{team.displayName}</h3>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 text-left py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[140px]">
                Player
              </th>
              {labels.map((label) => (
                <th
                  key={label}
                  className={`text-center py-2 px-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    HIGHLIGHT_LABELS.has(label)
                      ? "text-gray-700"
                      : "text-gray-400"
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Starters */}
            <tr>
              <td
                colSpan={labels.length + 1}
                className="bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400"
              >
                Starters
              </td>
            </tr>
            {starters.map((player, i) => (
              <PlayerRow
                key={player.name}
                player={player}
                labels={labels}
                isEven={i % 2 === 0}
              />
            ))}

            {/* Bench */}
            {bench.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={labels.length + 1}
                    className="bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400"
                  >
                    Bench
                  </td>
                </tr>
                {bench.map((player, i) => (
                  <PlayerRow
                    key={player.name}
                    player={player}
                    labels={labels}
                    isEven={i % 2 === 0}
                  />
                ))}
              </>
            )}

            {/* DNP */}
            {dnp.length > 0 &&
              dnp.map((player, i) => (
                <PlayerRow
                  key={player.name}
                  player={player}
                  labels={labels}
                  isEven={i % 2 === 0}
                />
              ))}

            {/* Team totals */}
            {team.totals.length > 0 && (
              <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                <td className="sticky left-0 z-10 bg-gray-100 py-2 px-2 text-xs text-gray-700 uppercase tracking-wider">
                  Totals
                </td>
                {team.totals.map((val, i) => (
                  <td
                    key={i}
                    className={`text-center py-2 px-1.5 tabular-nums text-xs whitespace-nowrap ${
                      HIGHLIGHT_LABELS.has(labels[i])
                        ? "text-gray-900"
                        : "text-gray-600"
                    }`}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoxScoreSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {[0, 1].map((t) => (
        <div key={t}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 bg-gray-200 rounded-full" />
            <div className="h-5 w-40 bg-gray-200 rounded" />
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-8 bg-gray-50" />
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-9 border-b border-gray-100"
                style={{ backgroundColor: i % 2 === 0 ? "#f9fafb" : "#ffffff" }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoxScore({
  gameId,
  onClose,
}: {
  gameId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<BoxScoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("boxscore");

  const fetchBoxScore = useCallback(async () => {
    try {
      const res = await fetch(`/api/boxscore/${gameId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error ?? `HTTP ${res.status}`
        );
      }
      const json: BoxScoreData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load box score"
      );
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchBoxScore();
    // Refresh box score every 30s for live games
    const interval = setInterval(fetchBoxScore, 30_000);
    return () => clearInterval(interval);
  }, [fetchBoxScore]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto mt-8 mb-8 mx-4 bg-white border border-gray-200 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with tabs */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-lg font-bold text-gray-900">Game Detail</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Tabs */}
          <div className="flex px-5 gap-1">
            <button
              onClick={() => setActiveTab("boxscore")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "boxscore"
                  ? "border-blue-500 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Box Score
            </button>
            <button
              onClick={() => setActiveTab("playbyplay")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "playbyplay"
                  ? "border-blue-500 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Play-by-Play
            </button>
          </div>
        </div>

        <div className="p-5">
          {isLoading && <BoxScoreSkeleton />}

          {error && !data && !isLoading && (
            <div className="text-center py-12">
              <p className="text-red-600 text-sm mb-3">{error}</p>
              <button
                onClick={fetchBoxScore}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {data && activeTab === "boxscore" && (
            <>
              <TeamBoxScore team={data.away} labels={data.labels} />
              <TeamBoxScore team={data.home} labels={data.labels} />
            </>
          )}

          {data && activeTab === "playbyplay" && (
            <PlayByPlay plays={data.plays} teams={data.teams} />
          )}
        </div>
      </div>
    </div>
  );
}
