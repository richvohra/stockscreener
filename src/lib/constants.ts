export const POLLING_INTERVAL_MS = 30_000;

export const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

export const API_SCORES_PATH = "/api/scores";

// Stock Tracker
export const STOCK_POLLING_INTERVAL_MS = 5_000;
export const API_STOCKS_PATH = "/api/stocks";
export const MIN_GAIN_PERCENT = 3;

export const ROBINHOOD_QUOTES_URL = "https://api.robinhood.com/quotes/";
export const ROBINHOOD_SP500_MOVERS_URL =
  "https://api.robinhood.com/midlands/movers/sp500/?direction=up";

export const INDEX_CONSTITUENTS_BASE_URL =
  "https://yfiua.github.io/index-constituents";

export const RUSSELL_2000_CSV_URL =
  "https://raw.githubusercontent.com/ikoniaris/Russell2000/master/russell_2000_components.csv";

export const INDEX_CONFIGS = [
  { key: "sp500", name: "S&P 500", file: "constituents-sp500.json", format: "json" as const },
  { key: "nasdaq100", name: "Nasdaq 100", file: "constituents-nasdaq100.json", format: "json" as const },
  { key: "dowjones", name: "Dow Jones", file: "constituents-dowjones.json", format: "json" as const },
  { key: "russell2000", name: "Russell 2000", file: "", format: "csv" as const },
];
