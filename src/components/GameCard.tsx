import Image from "next/image";
import type { Game } from "@/lib/types";
import { getStatusBgColor, formatStartTime } from "@/lib/utils";

function TeamRow({
  team,
  isLeading,
  gameState,
}: {
  team: Game["home"];
  isLeading: boolean;
  gameState: Game["state"];
}) {
  const showScore = gameState !== "pre";
  return (
    <div className="flex items-center gap-3 py-2">
      <Image
        src={team.logo}
        alt={team.abbreviation}
        width={32}
        height={32}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            isLeading && showScore ? "text-white" : "text-zinc-300"
          }`}
        >
          {team.displayName}
        </p>
        {team.record && (
          <p className="text-xs text-zinc-500">{team.record}</p>
        )}
      </div>
      {showScore && (
        <span
          className={`text-2xl font-bold tabular-nums ${
            isLeading ? "text-white" : "text-zinc-500"
          }`}
        >
          {team.score}
        </span>
      )}
    </div>
  );
}

function QuarterScores({ game }: { game: Game }) {
  if (game.state === "pre" || game.away.linescores.length === 0) return null;

  const quarters = Math.max(
    game.away.linescores.length,
    game.home.linescores.length
  );

  return (
    <div className="border-t border-zinc-800 pt-2 mt-1">
      <div className="grid gap-1 text-xs text-zinc-500" style={{ gridTemplateColumns: `1fr repeat(${quarters}, minmax(0, 1fr))` }}>
        <span />
        {Array.from({ length: quarters }, (_, i) => (
          <span key={i} className="text-center font-medium">
            {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
          </span>
        ))}
        <span className="font-medium">{game.away.abbreviation}</span>
        {Array.from({ length: quarters }, (_, i) => (
          <span key={i} className="text-center tabular-nums">
            {game.away.linescores[i] ?? "-"}
          </span>
        ))}
        <span className="font-medium">{game.home.abbreviation}</span>
        {Array.from({ length: quarters }, (_, i) => (
          <span key={i} className="text-center tabular-nums">
            {game.home.linescores[i] ?? "-"}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GameCard({ game }: { game: Game }) {
  const awayLeading =
    game.away.score !== null &&
    game.home.score !== null &&
    game.away.score > game.home.score;
  const homeLeading =
    game.away.score !== null &&
    game.home.score !== null &&
    game.home.score > game.away.score;

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1"
      style={{
        borderLeftWidth: 4,
        borderLeftColor:
          game.state === "in"
            ? "#22c55e"
            : `#${game.home.color}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBgColor(
            game.state
          )}`}
        >
          {game.state === "in" && (
            <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-live-pulse" />
          )}
          {game.state === "pre"
            ? formatStartTime(game.startTime)
            : game.statusDetail}
        </span>
        {game.broadcast && (
          <span className="text-xs text-zinc-600">{game.broadcast}</span>
        )}
      </div>

      {/* Teams */}
      <TeamRow
        team={game.away}
        isLeading={game.state === "post" ? game.away.isWinner : awayLeading}
        gameState={game.state}
      />
      <TeamRow
        team={game.home}
        isLeading={game.state === "post" ? game.home.isWinner : homeLeading}
        gameState={game.state}
      />

      {/* Quarter scores */}
      <QuarterScores game={game} />

      {/* Venue */}
      {game.venue && (
        <p className="text-xs text-zinc-600 mt-1 truncate">{game.venue}</p>
      )}
    </div>
  );
}
