import { NextResponse } from "next/server";
import type {
  BoxScoreData,
  BoxScorePlayer,
  BoxScoreTeam,
  Play,
  PlayTeamInfo,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface ESPNSummaryResponse {
  boxscore: {
    players: {
      team: {
        abbreviation: string;
        displayName: string;
        logo: string;
        color: string;
      };
      statistics: {
        labels: string[];
        totals: string[];
        athletes: {
          starter: boolean;
          didNotPlay?: boolean;
          athlete: {
            displayName: string;
            shortName: string;
            headshot: { href: string };
            jersey: string;
            position: { abbreviation: string };
          };
          stats: string[];
        }[];
      }[];
    }[];
  };
  plays?: {
    id: string;
    sequenceNumber: string;
    type: { text: string };
    text: string;
    awayScore: number;
    homeScore: number;
    period: { number: number; displayValue: string };
    clock: { displayValue: string };
    scoringPlay: boolean;
    scoreValue?: number;
    shootingPlay?: boolean;
    team?: { id: string };
  }[];
  header: {
    competitions: {
      competitors: {
        homeAway: string;
        team: {
          id: string;
          abbreviation: string;
          displayName: string;
          color: string;
          logos: { href: string }[];
        };
      }[];
    }[];
  };
}

function mapTeam(
  playerGroup: ESPNSummaryResponse["boxscore"]["players"][0]
): BoxScoreTeam {
  const statGroup = playerGroup.statistics[0];
  const players: BoxScorePlayer[] = statGroup.athletes.map((a) => ({
    name: a.athlete.displayName,
    shortName: a.athlete.shortName,
    headshot: a.athlete.headshot?.href ?? "",
    jersey: a.athlete.jersey ?? "",
    position: a.athlete.position?.abbreviation ?? "",
    starter: a.starter,
    didNotPlay: a.didNotPlay ?? false,
    stats: a.stats ?? [],
  }));

  return {
    abbreviation: playerGroup.team.abbreviation,
    displayName: playerGroup.team.displayName,
    logo: playerGroup.team.logo,
    color: playerGroup.team.color ?? "71717a",
    players,
    totals: statGroup.totals ?? [],
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch box score from ESPN" },
        { status: 502 }
      );
    }

    const data: ESPNSummaryResponse = await res.json();

    if (
      !data.boxscore?.players ||
      data.boxscore.players.length < 2
    ) {
      return NextResponse.json(
        { error: "Box score not yet available" },
        { status: 404 }
      );
    }

    const labels = data.boxscore.players[0].statistics[0]?.labels ?? [];

    // Figure out which team group is home vs away
    const headerComps =
      data.header?.competitions?.[0]?.competitors ?? [];
    const awayAbbr = headerComps.find(
      (c) => c.homeAway === "away"
    )?.team.abbreviation;

    let awayGroup = data.boxscore.players[0];
    let homeGroup = data.boxscore.players[1];

    // If the first group is actually the home team, swap
    if (
      awayAbbr &&
      data.boxscore.players[1].team.abbreviation === awayAbbr
    ) {
      awayGroup = data.boxscore.players[1];
      homeGroup = data.boxscore.players[0];
    } else if (
      awayAbbr &&
      data.boxscore.players[0].team.abbreviation === awayAbbr
    ) {
      // already correct
    }

    // Map plays
    const plays: Play[] = (data.plays ?? []).map((p) => ({
      id: p.id,
      sequenceNumber: parseInt(p.sequenceNumber, 10),
      period: p.period.number,
      periodDisplay: p.period.displayValue,
      clock: p.clock.displayValue,
      text: p.text,
      type: p.type.text,
      awayScore: p.awayScore,
      homeScore: p.homeScore,
      scoringPlay: p.scoringPlay,
      scoreValue: p.scoreValue ?? 0,
      shootingPlay: p.shootingPlay ?? false,
      teamId: p.team?.id ?? null,
    }));

    // Map team info from header for play-by-play coloring
    const teams: PlayTeamInfo[] = headerComps.map((c) => ({
      id: c.team.id,
      abbreviation: c.team.abbreviation,
      displayName: c.team.displayName,
      color: c.team.color ?? "71717a",
      logo: c.team.logos?.[0]?.href ?? "",
      homeAway: c.homeAway as "home" | "away",
    }));

    const payload: BoxScoreData = {
      gameId,
      labels,
      away: mapTeam(awayGroup),
      home: mapTeam(homeGroup),
      plays,
      teams,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch box score" },
      { status: 502 }
    );
  }
}
