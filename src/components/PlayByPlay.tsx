"use client";

import { useState, useMemo } from "react";
import type { Play, PlayTeamInfo } from "@/lib/types";

function PlayRow({
  play,
  teamMap,
}: {
  play: Play;
  teamMap: Map<string, PlayTeamInfo>;
}) {
  const team = play.teamId ? teamMap.get(play.teamId) : null;

  // Skip meta plays like "End Game" type rows unless they mark period ends
  const isEndPeriod = play.type === "End Period" || play.type === "End Game";
  if (isEndPeriod) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 bg-gray-100 border-y border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {play.text}
        </span>
        <span className="ml-auto text-xs font-bold text-gray-700 tabular-nums">
          {play.awayScore} - {play.homeScore}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 py-2 px-3 transition-colors ${
        play.scoringPlay
          ? "bg-yellow-50 hover:bg-yellow-100/70"
          : "hover:bg-gray-50"
      }`}
      style={
        team
          ? { borderLeft: `3px solid #${team.color}` }
          : { borderLeft: "3px solid transparent" }
      }
    >
      {/* Clock */}
      <span className="text-[11px] text-gray-400 tabular-nums w-10 shrink-0 pt-0.5 text-right">
        {play.clock}
      </span>

      {/* Team badge */}
      <span
        className="text-[10px] font-bold w-8 shrink-0 pt-0.5 text-center"
        style={team ? { color: `#${team.color}` } : { color: "#9ca3af" }}
      >
        {team?.abbreviation ?? ""}
      </span>

      {/* Play text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs leading-relaxed ${
            play.scoringPlay ? "text-gray-900" : "text-gray-500"
          }`}
        >
          {play.scoringPlay && (
            <span className="text-amber-600 font-bold mr-1.5">
              +{play.scoreValue}
            </span>
          )}
          {play.text}
        </p>
      </div>

      {/* Running score */}
      {play.scoringPlay && (
        <span className="text-xs font-bold text-gray-700 tabular-nums shrink-0 pt-0.5">
          {play.awayScore}-{play.homeScore}
        </span>
      )}
    </div>
  );
}

export function PlayByPlay({
  plays,
  teams,
}: {
  plays: Play[];
  teams: PlayTeamInfo[];
}) {
  const awayTeam = teams.find((t) => t.homeAway === "away");
  const homeTeam = teams.find((t) => t.homeAway === "home");

  // Get unique periods
  const periods = useMemo(() => {
    const set = new Set<number>();
    for (const p of plays) set.add(p.period);
    return Array.from(set).sort((a, b) => a - b);
  }, [plays]);

  const [selectedPeriod, setSelectedPeriod] = useState<number | "all">("all");
  const [filterType, setFilterType] = useState<"all" | "scoring">("all");

  const teamMap = useMemo(() => {
    const map = new Map<string, PlayTeamInfo>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const filteredPlays = useMemo(() => {
    let result = [...plays];
    if (selectedPeriod !== "all") {
      result = result.filter((p) => p.period === selectedPeriod);
    }
    if (filterType === "scoring") {
      // Keep scoring plays and period-end markers
      result = result.filter(
        (p) =>
          p.scoringPlay ||
          p.type === "End Period" ||
          p.type === "End Game"
      );
    }
    // Show most recent plays first
    return result.reverse();
  }, [plays, selectedPeriod, filterType]);

  if (plays.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">
          Play-by-play not yet available for this game.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Team header */}
      {awayTeam && homeTeam && (
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: `#${awayTeam.color}` }}
            >
              {awayTeam.abbreviation}
            </span>
          </div>
          <span className="text-gray-400 text-xs">vs</span>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: `#${homeTeam.color}` }}
            >
              {homeTeam.abbreviation}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Period filter */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
          <button
            onClick={() => setSelectedPeriod("all")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedPeriod === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            All
          </button>
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedPeriod === p
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {p <= 4 ? `Q${p}` : `OT${p - 4}`}
            </button>
          ))}
        </div>

        {/* Scoring filter */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterType === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            All Plays
          </button>
          <button
            onClick={() => setFilterType("scoring")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filterType === "scoring"
                ? "bg-amber-100 text-amber-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Scoring
          </button>
        </div>

        <span className="text-[10px] text-gray-400 ml-auto">
          {filteredPlays.length} plays
        </span>
      </div>

      {/* Play list */}
      <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
        {filteredPlays.map((play) => (
          <PlayRow key={play.id} play={play} teamMap={teamMap} />
        ))}
      </div>
    </div>
  );
}
