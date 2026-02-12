import { NextResponse } from "next/server";
import { ESPN_SCOREBOARD_URL } from "@/lib/constants";
import type {
  ESPNScoreboardResponse,
  ESPNCompetitor,
  Game,
  GameState,
  ScoreboardData,
  TeamScore,
} from "@/lib/types";

export const dynamic = "force-dynamic";

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
  };
}

export async function GET() {
  try {
    const res = await fetch(ESPN_SCOREBOARD_URL, {
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
      date: data.day?.date ?? new Date().toISOString().split("T")[0],
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
