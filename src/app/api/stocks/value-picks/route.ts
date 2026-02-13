import { NextResponse } from "next/server";
import {
  INDEX_CONFIGS,
  ROBINHOOD_HISTORICALS_URL,
  ROBINHOOD_FUNDAMENTALS_URL,
  MIN_DRAWDOWN_PERCENT,
  MIN_STOCK_PRICE,
} from "@/lib/constants";
import { fetchConstituents, fetchBatchQuotes } from "@/lib/stocks";
import type {
  RobinhoodHistoricalResponse,
  RobinhoodFundamentals,
  ValuePick,
  ValuePicksData,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory cache for value picks (expensive computation)
let valuePicksCache: { data: ValuePicksData; fetchedAt: number } | null = null;
const VALUE_PICKS_TTL = 60 * 60 * 1000; // 1 hour

async function fetchHistorical(
  symbol: string
): Promise<RobinhoodHistoricalResponse | null> {
  try {
    const url = `${ROBINHOOD_HISTORICALS_URL}${symbol}/?interval=day&span=year`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchFundamentals(
  symbol: string
): Promise<RobinhoodFundamentals | null> {
  try {
    const url = `${ROBINHOOD_FUNDAMENTALS_URL}${symbol}/`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (
      valuePicksCache &&
      Date.now() - valuePicksCache.fetchedAt < VALUE_PICKS_TTL
    ) {
      return NextResponse.json(valuePicksCache.data, {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Step 1: Fetch all constituent lists in parallel
    const constituentResults = await Promise.allSettled(
      INDEX_CONFIGS.map((cfg) =>
        fetchConstituents(cfg.key, cfg.file, cfg.format)
      )
    );

    // Collect all unique symbols with their names
    const symbolMap = new Map<string, string>(); // symbol -> name
    for (let i = 0; i < INDEX_CONFIGS.length; i++) {
      const result = constituentResults[i];
      if (result.status === "fulfilled") {
        for (const c of result.value) {
          if (!symbolMap.has(c.symbol)) {
            symbolMap.set(c.symbol, c.name);
          }
        }
      }
    }

    const allSymbols = Array.from(symbolMap.keys());

    // Step 2: Fetch current quotes for all symbols
    const quotes = await fetchBatchQuotes(allSymbols);

    // Step 3: Fetch historical data to find 52-week highs
    // Process in batches to avoid overwhelming the API
    const batchSize = 50;
    const candidates: {
      symbol: string;
      name: string;
      price: number;
      previousClose: number;
      changePercent: number;
      changeAmount: number;
      high52Week: number;
      drawdownPercent: number;
    }[] = [];

    for (let i = 0; i < allSymbols.length; i += batchSize) {
      const batch = allSymbols.slice(i, i + batchSize);
      const historicalResults = await Promise.allSettled(
        batch.map((symbol) => fetchHistorical(symbol))
      );

      for (let j = 0; j < batch.length; j++) {
        const symbol = batch[j];
        const quote = quotes.get(symbol);
        if (!quote) continue;

        const price = parseFloat(quote.last_trade_price);
        const prevClose = parseFloat(
          quote.adjusted_previous_close || quote.previous_close
        );
        if (!prevClose || prevClose === 0) continue;
        if (price < MIN_STOCK_PRICE) continue;

        const histResult = historicalResults[j];
        if (histResult.status !== "fulfilled" || !histResult.value) continue;

        const historicals = histResult.value.historicals;
        if (!historicals || historicals.length === 0) continue;

        // Find the 52-week high
        const high52Week = Math.max(
          ...historicals.map((h) => parseFloat(h.high_price))
        );
        if (high52Week <= 0) continue;

        const drawdownPercent = ((high52Week - price) / high52Week) * 100;

        if (drawdownPercent >= MIN_DRAWDOWN_PERCENT) {
          const changeAmount = price - prevClose;
          const changePercent = (changeAmount / prevClose) * 100;

          candidates.push({
            symbol,
            name: symbolMap.get(symbol) || symbol,
            price,
            previousClose: prevClose,
            changePercent: Math.round(changePercent * 100) / 100,
            changeAmount: Math.round(changeAmount * 100) / 100,
            high52Week,
            drawdownPercent: Math.round(drawdownPercent * 100) / 100,
          });
        }
      }
    }

    // Step 4: Fetch fundamentals for candidates (limited to top 50 by drawdown)
    candidates.sort((a, b) => b.drawdownPercent - a.drawdownPercent);
    const topCandidates = candidates.slice(0, 50);

    const fundamentalsResults = await Promise.allSettled(
      topCandidates.map((c) => fetchFundamentals(c.symbol))
    );

    const picks: ValuePick[] = [];
    for (let i = 0; i < topCandidates.length; i++) {
      const candidate = topCandidates[i];
      const fundResult = fundamentalsResults[i];
      const fundamentals =
        fundResult.status === "fulfilled" ? fundResult.value : null;

      picks.push({
        ...candidate,
        marketCap: fundamentals?.market_cap
          ? parseFloat(fundamentals.market_cap)
          : 0,
        peRatio: fundamentals?.pe_ratio
          ? parseFloat(fundamentals.pe_ratio)
          : null,
        dividendYield: fundamentals?.dividend_yield
          ? parseFloat(fundamentals.dividend_yield)
          : null,
        sector: fundamentals?.sector || "Unknown",
        industry: fundamentals?.industry || "Unknown",
        description: fundamentals?.description || "",
      });
    }

    // Sort by drawdown (biggest drawdown first)
    picks.sort((a, b) => b.drawdownPercent - a.drawdownPercent);

    const response: ValuePicksData = {
      picks,
      totalScanned: allSymbols.length,
      totalQualified: candidates.length,
      fetchedAt: new Date().toISOString(),
    };

    // Cache the result
    valuePicksCache = { data: response, fetchedAt: Date.now() };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Value picks API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch value picks" },
      { status: 500 }
    );
  }
}
