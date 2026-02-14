export interface Message {
  role: "user" | "assistant";
  content: string;
}

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
  leaders?: ESPNLeaderCategory[];
}

export interface ESPNLeaderCategory {
  name: string;
  displayName: string;
  leaders: {
    displayValue: string;
    athlete: {
      displayName: string;
      shortName: string;
      headshot: string;
      position: { abbreviation: string };
    };
  }[];
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

// NBA Application model

export type GameState = "pre" | "in" | "post";

export interface TeamLeader {
  category: string;
  displayCategory: string;
  playerName: string;
  value: string;
  headshot: string;
}

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
  leaders: TeamLeader[];
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

// League Leaders

export interface LeagueLeaderEntry {
  rank: number;
  playerName: string;
  headshot: string;
  teamAbbreviation: string;
  teamColor: string;
  value: string;
}

export interface LeagueLeaderCategory {
  category: string;
  displayName: string;
  abbreviation: string;
  east: LeagueLeaderEntry[];
  west: LeagueLeaderEntry[];
}

export interface LeagueLeadersData {
  categories: LeagueLeaderCategory[];
  fetchedAt: string;
}

// Standings

export interface StandingsTeam {
  rank: number;
  abbreviation: string;
  displayName: string;
  logo: string;
  wins: number;
  losses: number;
  record: string;
  winPercent: string;
  gamesBehind: string;
  streak: string;
  confRecord: string;
  homeRecord: string;
  awayRecord: string;
  lastTen: string;
}

export interface ConferenceStandingsData {
  east: StandingsTeam[];
  west: StandingsTeam[];
  fetchedAt: string;
}

// Box Score

export interface BoxScorePlayer {
  name: string;
  shortName: string;
  headshot: string;
  jersey: string;
  position: string;
  starter: boolean;
  didNotPlay: boolean;
  stats: string[]; // ordered by stat labels
}

export interface BoxScoreTeam {
  abbreviation: string;
  displayName: string;
  logo: string;
  color: string;
  players: BoxScorePlayer[];
  totals: string[];
}

export interface BoxScoreData {
  gameId: string;
  labels: string[]; // ["MIN","PTS","FG","3PT","FT","REB","AST","TO","STL","BLK","OREB","DREB","PF","+/-"]
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  plays: Play[];
  teams: PlayTeamInfo[];
  fetchedAt: string;
}

// Play-by-Play

export interface Play {
  id: string;
  sequenceNumber: number;
  period: number;
  periodDisplay: string;
  clock: string;
  text: string;
  type: string;
  awayScore: number;
  homeScore: number;
  scoringPlay: boolean;
  scoreValue: number;
  shootingPlay: boolean;
  teamId: string | null;
}

export interface PlayTeamInfo {
  id: string;
  abbreviation: string;
  displayName: string;
  color: string;
  logo: string;
  homeAway: "home" | "away";
}

// Team Schedule

export interface ScheduleGame {
  id: string;
  date: string;
  opponent: {
    abbreviation: string;
    displayName: string;
    logo: string;
  };
  homeAway: "home" | "away";
  venue: string;
  broadcast: string | null;
  statusDetail: string;
}

export interface TeamScheduleData {
  teamName: string;
  teamAbbreviation: string;
  teamLogo: string;
  games: ScheduleGame[];
  fetchedAt: string;
}

// Stock Tracker

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  changeAmount: number;
  updatedAt: string;
}

export interface IndexData {
  name: string;
  displayName: string;
  stocks: StockQuote[];
  totalConstituents: number;
}

export interface StockTrackerData {
  indices: IndexData[];
  marketOpen: boolean;
  fetchedAt: string;
}

// Robinhood API response types (only fields we consume)

export interface RobinhoodQuote {
  symbol: string;
  last_trade_price: string;
  previous_close: string;
  adjusted_previous_close: string;
  updated_at: string;
  trading_halted: boolean;
}

export interface RobinhoodQuotesResponse {
  results: (RobinhoodQuote | null)[];
}

export interface RobinhoodMover {
  instrument_url: string;
  symbol: string;
  updated_at: string;
  price_movement: {
    market_hours_last_movement_pct: string;
    market_hours_last_price: string;
  };
  description: string;
}

export interface RobinhoodMoversResponse {
  results: RobinhoodMover[];
}

export interface IndexConstituent {
  symbol: string;
  name: string;
}

// Value Picks (Beaten Down Stocks)

export interface RobinhoodHistorical {
  begins_at: string;
  close_price: string;
  high_price: string;
  low_price: string;
  open_price: string;
  volume: number;
}

export interface RobinhoodHistoricalResponse {
  symbol: string;
  historicals: RobinhoodHistorical[];
}

export interface RobinhoodFundamentals {
  headquarters_city: string;
  headquarters_state: string;
  sector: string;
  industry: string;
  description: string;
  market_cap: string;
  pe_ratio: string | null;
  dividend_yield: string | null;
  high_52_weeks: string;
  low_52_weeks: string;
}

export interface ValuePick {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  changeAmount: number;
  high52Week: number;
  drawdownPercent: number;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  sector: string;
  industry: string;
  description: string;
}

export interface ValuePicksData {
  picks: ValuePick[];
  totalScanned: number;
  totalQualified: number;
  fetchedAt: string;
}

// Top 10 Picks (Highest Upside Potential)

export interface ScoreBreakdown {
  recoveryPotential: number;
  momentum: number;
  volumeConfirmation: number;
  valuation: number;
  marketCap: number;
  recentMomentum: number;
}

export interface TopPick {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  changeAmount: number;
  high52Week: number;
  drawdownPercent: number;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  sector: string;
  industry: string;
  compositeScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasoning: string;
}

export interface TopPicksData {
  picks: TopPick[];
  totalScanned: number;
  totalCandidates: number;
  fetchedAt: string;
}
