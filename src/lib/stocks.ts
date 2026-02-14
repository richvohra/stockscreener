import {
  INDEX_CONSTITUENTS_BASE_URL,
  ROBINHOOD_QUOTES_URL,
  RUSSELL_2000_CSV_URL,
} from "@/lib/constants";
import type {
  IndexConstituent,
  RobinhoodQuote,
  RobinhoodQuotesResponse,
} from "@/lib/types";

// Technical Analysis Utilities

export function computeSMA(
  closes: number[],
  period: number
): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

export type CrossoverSignal = "bullish" | "bearish" | null;

export function detectCrossover(
  sma5: (number | null)[],
  sma20: (number | null)[]
): { signal: CrossoverSignal; daysAgo: number | null } {
  for (let i = sma5.length - 1; i >= 1; i--) {
    const cur5 = sma5[i];
    const cur20 = sma20[i];
    const prev5 = sma5[i - 1];
    const prev20 = sma20[i - 1];
    if (cur5 === null || cur20 === null || prev5 === null || prev20 === null)
      continue;

    if (prev5 <= prev20 && cur5 > cur20) {
      return { signal: "bullish", daysAgo: sma5.length - 1 - i };
    }
    if (prev5 >= prev20 && cur5 < cur20) {
      return { signal: "bearish", daysAgo: sma5.length - 1 - i };
    }
  }
  return { signal: null, daysAgo: null };
}

// In-memory cache for constituent lists (they rarely change)
const constituentsCache: Record<
  string,
  { data: IndexConstituent[]; fetchedAt: number }
> = {};
const CONSTITUENTS_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchConstituents(
  indexKey: string,
  file: string,
  format: "json" | "csv"
): Promise<IndexConstituent[]> {
  const cached = constituentsCache[indexKey];
  if (cached && Date.now() - cached.fetchedAt < CONSTITUENTS_TTL) {
    return cached.data;
  }

  let data: IndexConstituent[];

  if (format === "csv") {
    // Russell 2000 from CSV
    const res = await fetch(RUSSELL_2000_CSV_URL, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${indexKey} constituents: ${res.status}`
      );
    }
    const csv = await res.text();
    const lines = csv.trim().split("\n").slice(1); // skip header
    data = lines
      .map((line) => {
        const [ticker, ...nameParts] = line.split(",");
        return {
          symbol: ticker.trim().replace(".", "-"),
          name: nameParts.join(",").trim(),
        };
      })
      .filter((item) => item.symbol.length > 0);
  } else {
    const url = `${INDEX_CONSTITUENTS_BASE_URL}/${file}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${indexKey} constituents: ${res.status}`
      );
    }
    const raw: { Symbol: string; Name: string }[] = await res.json();
    data = raw.map((item) => ({
      symbol: item.Symbol.replace(".", "-"),
      name: item.Name,
    }));
  }

  constituentsCache[indexKey] = { data, fetchedAt: Date.now() };
  return data;
}

export async function fetchBatchQuotes(
  symbols: string[]
): Promise<Map<string, RobinhoodQuote>> {
  const map = new Map<string, RobinhoodQuote>();
  if (symbols.length === 0) return map;

  // Robinhood supports up to 1630 symbols per request
  const batchSize = 1600;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const url = `${ROBINHOOD_QUOTES_URL}?symbols=${batch.join(",")}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) continue;

    const data: RobinhoodQuotesResponse = await res.json();
    for (const quote of data.results) {
      if (quote) {
        map.set(quote.symbol, quote);
      }
    }
  }

  return map;
}
