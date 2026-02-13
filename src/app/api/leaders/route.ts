import { NextResponse } from "next/server";
import type {
  LeagueLeaderEntry,
  LeagueLeaderCategory,
  LeagueLeadersData,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const ESPN_LEADERS_URL =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2026/types/2/leaders?limit=20";

// Team ID → conference mapping (ESPN team IDs)
// East divisions: Atlantic(1,2,17,18,20,28), Central(4,5,8,11,15), Southeast(1,14,19,27,30)
// West divisions: Midwest(3,6,10,24,29), Pacific(9,12,13,21,23), Northwest(7,16,22,25,26)
const EAST_TEAM_IDS = new Set([
  "1", "2", "4", "5", "8", "11", "14", "15", "17", "18", "19", "20", "27", "28", "30",
]);
const WEST_TEAM_IDS = new Set([
  "3", "6", "7", "9", "10", "12", "13", "16", "21", "22", "23", "24", "25", "26", "29",
]);

const CATEGORIES_WE_WANT = ["pointsPerGame", "reboundsPerGame", "assistsPerGame"];

interface ESPNLeadersResponse {
  categories: {
    name: string;
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    leaders: {
      displayValue: string;
      value: number;
      athlete: { $ref: string };
      team: { $ref: string };
    }[];
  }[];
}

interface ESPNAthleteResponse {
  displayName: string;
  shortName: string;
  headshot?: { href: string };
}

interface ESPNTeamResponse {
  abbreviation: string;
  color: string;
}

// Simple in-memory cache to avoid re-fetching the same athlete/team refs
const athleteCache = new Map<string, ESPNAthleteResponse>();
const teamCache = new Map<string, ESPNTeamResponse>();

async function fetchAthlete(ref: string): Promise<ESPNAthleteResponse> {
  const cached = athleteCache.get(ref);
  if (cached) return cached;
  const res = await fetch(ref);
  const data: ESPNAthleteResponse = await res.json();
  athleteCache.set(ref, data);
  return data;
}

async function fetchTeam(ref: string): Promise<ESPNTeamResponse> {
  const cached = teamCache.get(ref);
  if (cached) return cached;
  const res = await fetch(ref);
  const data: ESPNTeamResponse = await res.json();
  teamCache.set(ref, data);
  return data;
}

function extractTeamId(ref: string): string {
  // e.g. ".../teams/13?lang=en..."
  const match = ref.match(/teams\/(\d+)/);
  return match ? match[1] : "";
}

export async function GET() {
  try {
    const res = await fetch(ESPN_LEADERS_URL, { next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch leaders from ESPN" },
        { status: 502 }
      );
    }

    const data: ESPNLeadersResponse = await res.json();

    const categories: LeagueLeaderCategory[] = [];

    for (const cat of data.categories) {
      if (!CATEGORIES_WE_WANT.includes(cat.name)) continue;

      const eastEntries: LeagueLeaderEntry[] = [];
      const westEntries: LeagueLeaderEntry[] = [];

      // Resolve all athletes and teams in parallel for this category
      const resolved = await Promise.all(
        cat.leaders.map(async (leader) => {
          const teamId = extractTeamId(leader.team.$ref);
          const [athlete, team] = await Promise.all([
            fetchAthlete(leader.athlete.$ref),
            fetchTeam(leader.team.$ref),
          ]);
          return {
            displayValue: leader.displayValue,
            teamId,
            athlete,
            team,
          };
        })
      );

      let eastRank = 0;
      let westRank = 0;

      for (const r of resolved) {
        const entry: LeagueLeaderEntry = {
          rank: 0,
          playerName: r.athlete.shortName,
          headshot:
            r.athlete.headshot?.href ??
            `https://a.espncdn.com/i/headshots/nba/players/full/0.png`,
          teamAbbreviation: r.team.abbreviation,
          teamColor: r.team.color,
          value: r.displayValue,
        };

        if (EAST_TEAM_IDS.has(r.teamId) && eastEntries.length < 5) {
          eastRank++;
          eastEntries.push({ ...entry, rank: eastRank });
        } else if (WEST_TEAM_IDS.has(r.teamId) && westEntries.length < 5) {
          westRank++;
          westEntries.push({ ...entry, rank: westRank });
        }
      }

      categories.push({
        category: cat.name,
        displayName: cat.displayName,
        abbreviation: cat.abbreviation,
        east: eastEntries,
        west: westEntries,
      });
    }

    const payload: LeagueLeadersData = {
      categories,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch leaders" },
      { status: 502 }
    );
  }
}
