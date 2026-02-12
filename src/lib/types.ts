// ESPN API response types (only fields we consume)

export interface ESPNScoreboardResponse {
  events: ESPNEvent[];
  day: { date: string };
}

export interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  competitions: ESPNCompetition[];
  status: ESPNStatus;
}

export interface ESPNCompetition {
  id: string;
  competitors: ESPNCompetitor[];
  broadcasts: { market: string; names: string[] }[];
  venue: {
    fullName: string;
    address: { city: string; state: string };
  };
}

export interface ESPNCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner: boolean;
  score: string;
  linescores?: { value: number }[];
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    color: string;
    alternateColor: string;
    logo: string;
  };
  records?: { name: string; type: string; summary: string }[];
}

export interface ESPNStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: string;
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

// Application model

export type GameState = "pre" | "in" | "post";

export interface TeamScore {
  id: string;
  abbreviation: string;
  displayName: string;
  shortName: string;
  logo: string;
  color: string;
  score: number | null;
  record: string | null;
  isWinner: boolean;
  linescores: number[];
}

export interface Game {
  id: string;
  startTime: string;
  state: GameState;
  statusDetail: string;
  period: number;
  clock: string;
  venue: string;
  broadcast: string | null;
  home: TeamScore;
  away: TeamScore;
}

export interface ScoreboardData {
  date: string;
  games: Game[];
  fetchedAt: string;
}
