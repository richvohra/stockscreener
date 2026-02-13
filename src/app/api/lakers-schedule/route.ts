import { NextResponse } from "next/server";
import type { ScheduleGame, TeamScheduleData } from "@/lib/types";

export const dynamic = "force-dynamic";

const LAKERS_TEAM_ID = "13";

interface ESPNScheduleResponse {
  team: {
    displayName: string;
    abbreviation: string;
    logos?: { href: string }[];
  };
  events: {
    id: string;
    date: string;
    name: string;
    shortName: string;
    competitions: {
      competitors: {
        homeAway: string;
        team: {
          id: string;
          abbreviation: string;
          displayName: string;
          logos?: { href: string }[];
        };
      }[];
      venue?: {
        fullName: string;
      };
      broadcasts?: {
        market?: { type?: string };
        media?: { shortName?: string };
      }[];
      status: {
        type: {
          state: string;
          shortDetail: string;
        };
      };
    }[];
  }[];
}

export async function GET() {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${LAKERS_TEAM_ID}/schedule?season=2026&seasontype=2`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Lakers schedule from ESPN" },
        { status: 502 }
      );
    }

    const data: ESPNScheduleResponse = await res.json();

    // Filter to only upcoming games (state === "pre")
    const upcomingEvents = data.events.filter(
      (e) => e.competitions[0]?.status?.type?.state === "pre"
    );

    // Take only the next 5
    const next5 = upcomingEvents.slice(0, 5);

    const games: ScheduleGame[] = next5.map((event) => {
      const comp = event.competitions[0];
      const lakersComp = comp.competitors.find(
        (c) => c.team.id === LAKERS_TEAM_ID
      );
      const opponentComp = comp.competitors.find(
        (c) => c.team.id !== LAKERS_TEAM_ID
      );

      // Find national broadcast first, fallback to any
      const nationalBroadcast = comp.broadcasts?.find(
        (b) => b.market?.type === "National"
      );
      const broadcast =
        nationalBroadcast?.media?.shortName ??
        comp.broadcasts?.[0]?.media?.shortName ??
        null;

      return {
        id: event.id,
        date: event.date,
        opponent: {
          abbreviation: opponentComp?.team.abbreviation ?? "",
          displayName: opponentComp?.team.displayName ?? "",
          logo: opponentComp?.team.logos?.[0]?.href ?? "",
        },
        homeAway: (lakersComp?.homeAway ?? "home") as "home" | "away",
        venue: comp.venue?.fullName ?? "",
        broadcast,
        statusDetail: comp.status.type.shortDetail,
      };
    });

    const payload: TeamScheduleData = {
      teamName: data.team.displayName,
      teamAbbreviation: data.team.abbreviation,
      teamLogo: data.team.logos?.[0]?.href ?? "",
      games,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch Lakers schedule" },
      { status: 502 }
    );
  }
}
