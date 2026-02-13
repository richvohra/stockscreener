import { NextResponse } from "next/server";
import type { StandingsTeam, ConferenceStandingsData } from "@/lib/types";

export const dynamic = "force-dynamic";

const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2026";

interface ESPNStandingsEntry {
  team: {
    abbreviation: string;
    displayName: string;
    logos: { href: string }[];
  };
  stats: { name: string; displayValue?: string; value?: number }[];
}

interface ESPNStandingsResponse {
  children: {
    name: string;
    standings: {
      entries: ESPNStandingsEntry[];
    };
  }[];
}

function getStat(
  stats: ESPNStandingsEntry["stats"],
  name: string
): string {
  const stat = stats.find((s) => s.name === name);
  return stat?.displayValue ?? String(stat?.value ?? "-");
}

function getStatNum(
  stats: ESPNStandingsEntry["stats"],
  name: string
): number {
  const stat = stats.find((s) => s.name === name);
  return stat?.value ?? 0;
}

function mapEntries(entries: ESPNStandingsEntry[]): StandingsTeam[] {
  // Sort by wins descending, then win% descending
  const sorted = [...entries].sort((a, b) => {
    const winsA = getStatNum(a.stats, "wins");
    const winsB = getStatNum(b.stats, "wins");
    if (winsB !== winsA) return winsB - winsA;
    return (
      getStatNum(b.stats, "winPercent") - getStatNum(a.stats, "winPercent")
    );
  });

  return sorted.map((entry, i) => ({
    rank: i + 1,
    abbreviation: entry.team.abbreviation,
    displayName: entry.team.displayName,
    logo: entry.team.logos?.[0]?.href ?? "",
    wins: getStatNum(entry.stats, "wins"),
    losses: getStatNum(entry.stats, "losses"),
    record: getStat(entry.stats, "overall"),
    winPercent: getStat(entry.stats, "winPercent"),
    gamesBehind: getStat(entry.stats, "gamesBehind"),
    streak: getStat(entry.stats, "streak"),
    confRecord: getStat(entry.stats, "vs. Conf."),
    homeRecord: getStat(entry.stats, "Home"),
    awayRecord: getStat(entry.stats, "Road"),
    lastTen: getStat(entry.stats, "Last Ten Games"),
  }));
}

export async function GET() {
  try {
    const res = await fetch(ESPN_STANDINGS_URL, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch standings from ESPN" },
        { status: 502 }
      );
    }

    const data: ESPNStandingsResponse = await res.json();

    const eastConf = data.children.find((c) =>
      c.name.toLowerCase().includes("eastern")
    );
    const westConf = data.children.find((c) =>
      c.name.toLowerCase().includes("western")
    );

    const payload: ConferenceStandingsData = {
      east: eastConf ? mapEntries(eastConf.standings.entries) : [],
      west: westConf ? mapEntries(westConf.standings.entries) : [],
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 502 }
    );
  }
}
