import Image from "next/image";
import type { Game, TeamLeader, TeamScore } from "@/lib/types";
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
            isLeading && showScore ? "text-gray-900" : "text-gray-600"
          }`}
        >
          {team.displayName}
        </p>
        {team.record && (
          <p className="text-xs text-gray-400">{team.record}</p>
        )}
      </div>
      {showScore && (
        <span
          className={`text-2xl font-bold tabular-nums ${
            isLeading ? "text-gray-900" : "text-gray-400"
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
    <div className="border-t border-gray-200 pt-2 mt-1">
      <div
        className="grid gap-1 text-xs text-gray-400"
        style={{
          gridTemplateColumns: `1fr repeat(${quarters}, minmax(0, 1fr))`,
        }}
      >
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

const CATEGORY_LABELS: Record<string, string> = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
};

function LeaderRow({ leader }: { leader: TeamLeader }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-9 h-9 shrink-0">
        <Image
          src={leader.headshot}
          alt={leader.playerName}
          width={36}
          height={36}
          className="rounded-full object-cover border-2 border-gray-200"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 font-medium truncate leading-tight">
          {leader.playerName}
        </p>
        <p className="text-gray-400 tabular-nums leading-tight">
          {leader.value} {CATEGORY_LABELS[leader.category] ?? leader.displayCategory}
        </p>
      </div>
    </div>
  );
}

function TeamLeaders({
  team,
  teamColor,
}: {
  team: TeamScore;
  teamColor: string;
}) {
  if (team.leaders.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-1 h-4 rounded-full"
          style={{ backgroundColor: `#${teamColor}` }}
        />
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {team.abbreviation} Leaders
        </p>
      </div>
      {team.leaders.map((leader) => (
        <LeaderRow key={leader.category} leader={leader} />
      ))}
    </div>
  );
}

export function GameCard({
  game,
  onClickBoxScore,
}: {
  game: Game;
  onClickBoxScore?: (gameId: string) => void;
}) {
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
      className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-1 shadow-sm"
      style={{
        borderLeftWidth: 4,
        borderLeftColor:
          game.state === "in" ? "#22c55e" : `#${game.home.color}`,
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
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-live-pulse" />
          )}
          {game.state === "pre"
            ? formatStartTime(game.startTime)
            : game.statusDetail}
        </span>
        {game.broadcast && (
          <span className="text-xs text-gray-400">{game.broadcast}</span>
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

      {/* Leading scorers per team */}
      {game.state !== "pre" &&
        (game.away.leaders.length > 0 || game.home.leaders.length > 0) && (
          <div className="border-t border-gray-200 pt-3 mt-2 space-y-3 text-xs">
            <TeamLeaders team={game.away} teamColor={game.away.color} />
            <TeamLeaders team={game.home} teamColor={game.home.color} />
          </div>
        )}

      {/* Box Score button + Venue */}
      <div className="flex items-center justify-between mt-2">
        {game.venue && (
          <p className="text-xs text-gray-400 truncate flex-1">{game.venue}</p>
        )}
        {game.state !== "pre" && onClickBoxScore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClickBoxScore(game.id);
            }}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
          >
            Box Score
          </button>
        )}
      </div>
    </div>
  );
}
