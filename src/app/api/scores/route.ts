import { NextResponse } from "next/server";
import { ESPN_SCOREBOARD_URL } from "@/lib/constants";
import type {
  ESPNScoreboardResponse,
  ESPNCompetitor,
  Game,
  GameState,
  ScoreboardData,
  TeamScore,
  TeamLeader,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Get today's date in Eastern Time as YYYYMMDD for the ESPN API.
 * ESPN's default scoreboard returns the last game day, not necessarily today.
 * By explicitly passing today's date, we always get today's games (or an empty
 * list if there are none, e.g. All-Star break).
 */
function getTodayET(): string {
  const now = new Date();
  const etDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const yyyy = etDate.getFullYear();
  const mm = String(etDate.getMonth() + 1).padStart(2, "0");
  const dd = String(etDate.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function getTodayISOET(): string {
  const today = getTodayET();
  return `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
}

function mapLeaders(c: ESPNCompetitor): TeamLeader[] {
  if (!c.leaders) return [];
  return c.leaders
    .filter((cat) => ["points", "rebounds", "assists"].includes(cat.name))
    .map((cat) => {
      const top = cat.leaders[0];
      return {
        category: cat.name,
        displayCategory: cat.displayName,
        playerName: top.athlete.shortName,
        value: top.displayValue,
        headshot: top.athlete.headshot,
      };
    });
}

function mapCompetitor(c: ESPNCompetitor): TeamScore {
  const score = parseInt(c.score, 10);
  return {
    id: c.team.id,
    abbreviation: c.team.abbreviation,
    displayName: c.team.displayName,
    shortName: c.team.shortDisplayName,
    logo: c.team.logo,
    color: c.team.color,
    score: isNaN(score) ? null : score,
    record:
      c.records?.find((r) => r.type === "total")?.summary ?? null,
    isWinner: c.winner,
    linescores: c.linescores?.map((ls) => ls.value) ?? [],
    leaders: mapLeaders(c),
  };
}

export async function GET() {
  try {
    const todayParam = getTodayET();
    const url = `${ESPN_SCOREBOARD_URL}?dates=${todayParam}`;

    const res = await fetch(url, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch scores from ESPN" },
        { status: 502 }
      );
    }

    const data: ESPNScoreboardResponse = await res.json();

    const games: Game[] = data.events.map((event) => {
      const comp = event.competitions[0];
      const homeComp = comp.competitors.find((c) => c.homeAway === "home")!;
      const awayComp = comp.competitors.find((c) => c.homeAway === "away")!;

      const broadcast =
        comp.broadcasts?.[0]?.names?.[0] ?? null;

      return {
        id: event.id,
        startTime: event.date,
        state: event.status.type.state as GameState,
        statusDetail: event.status.type.detail,
        period: event.status.period,
        clock: event.status.displayClock,
        venue: comp.venue?.fullName ?? "",
        broadcast,
        home: mapCompetitor(homeComp),
        away: mapCompetitor(awayComp),
      };
    });

    const payload: ScoreboardData = {
      date: data.day?.date ?? getTodayISOET(),
      games,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 502 }
    );
  }
}
