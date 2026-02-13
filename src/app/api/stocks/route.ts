import { NextResponse } from "next/server";
import {
  INDEX_CONSTITUENTS_BASE_URL,
  INDEX_CONFIGS,
  ROBINHOOD_QUOTES_URL,
  RUSSELL_2000_CSV_URL,
  MIN_GAIN_PERCENT,
} from "@/lib/constants";
import type {
  IndexConstituent,
  RobinhoodQuote,
  RobinhoodQuotesResponse,
  StockQuote,
  IndexData,
  StockTrackerData,
} from "@/lib/types";
import { isMarketOpen } from "@/lib/utils";

export const dynamic = "force-dynamic";

// In-memory cache for constituent lists (they rarely change)
const constituentsCache: Record<
  string,
  { data: IndexConstituent[]; fetchedAt: number }
> = {};
const CONSTITUENTS_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchConstituents(
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

async function fetchBatchQuotes(
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

function buildIndexData(
  name: string,
  displayName: string,
  constituents: IndexConstituent[],
  quotes: Map<string, RobinhoodQuote>
): IndexData {
  const stocks: StockQuote[] = [];

  for (const constituent of constituents) {
    const quote = quotes.get(constituent.symbol);
    if (!quote) continue;

    const price = parseFloat(quote.last_trade_price);
    const prevClose = parseFloat(
      quote.adjusted_previous_close || quote.previous_close
    );
    if (!prevClose || prevClose === 0) continue;

    const changeAmount = price - prevClose;
    const changePercent = (changeAmount / prevClose) * 100;

    if (changePercent >= MIN_GAIN_PERCENT) {
      stocks.push({
        symbol: constituent.symbol,
        name: constituent.name,
        price,
        previousClose: prevClose,
        changePercent: Math.round(changePercent * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        updatedAt: quote.updated_at,
      });
    }
  }

  stocks.sort((a, b) => b.changePercent - a.changePercent);

  return {
    name,
    displayName,
    stocks,
    totalConstituents: constituents.length,
  };
}

export async function GET() {
  try {
    // Fetch all constituent lists in parallel
    const constituentResults = await Promise.allSettled(
      INDEX_CONFIGS.map((cfg) =>
        fetchConstituents(cfg.key, cfg.file, cfg.format)
      )
    );

    // Collect all unique symbols across all indices
    const allSymbols = new Set<string>();
    const constituentsByIndex: Record<string, IndexConstituent[]> = {};

    for (let i = 0; i < INDEX_CONFIGS.length; i++) {
      const result = constituentResults[i];
      const key = INDEX_CONFIGS[i].key;

      if (result.status === "fulfilled") {
        constituentsByIndex[key] = result.value;
        for (const c of result.value) {
          allSymbols.add(c.symbol);
        }
      } else {
        constituentsByIndex[key] = [];
      }
    }

    // Fetch all quotes in one batch (or a few batches if > 1600)
    const quotes = await fetchBatchQuotes(Array.from(allSymbols));

    // Build index data for each index
    const indices: IndexData[] = INDEX_CONFIGS.map((cfg) =>
      buildIndexData(
        cfg.key,
        cfg.name,
        constituentsByIndex[cfg.key] || [],
        quotes
      )
    );

    const response: StockTrackerData = {
      indices,
      marketOpen: isMarketOpen(),
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Stock tracker API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
