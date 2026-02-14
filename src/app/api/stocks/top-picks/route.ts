import { NextResponse } from "next/server";
import {
  INDEX_CONFIGS,
  ROBINHOOD_HISTORICALS_URL,
  ROBINHOOD_FUNDAMENTALS_URL,
  MIN_STOCK_PRICE,
  TOP_PICKS_COUNT,
} from "@/lib/constants";
import { fetchConstituents, fetchBatchQuotes, computeSMA } from "@/lib/stocks";
import type {
  RobinhoodHistoricalResponse,
  RobinhoodFundamentals,
  ScoreBreakdown,
  TopPick,
  TopPicksData,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory cache (expensive computation)
let topPicksCache: { data: TopPicksData; fetchedAt: number } | null = null;
const TOP_PICKS_TTL = 60 * 60 * 1000; // 1 hour

// --- Scoring functions ---

function scoreRecoveryPotential(drawdownPercent: number): number {
  return Math.min(drawdownPercent / 50, 1.0);
}

function scoreMomentum(
  currentPrice: number,
  sma5: number | null,
  sma20: number | null
): number {
  let score = 0;
  if (sma20 !== null && currentPrice > sma20) score += 0.5;
  if (sma5 !== null && sma20 !== null && sma5 > sma20) score += 0.5;
  return score;
}

function scoreVolume(volumes: number[]): number {
  if (volumes.length < 50) return 0.5;
  const recent10 = volumes.slice(-10);
  const last50 = volumes.slice(-50);
  const avgRecent =
    recent10.reduce((s, v) => s + v, 0) / recent10.length;
  const avgLong = last50.reduce((s, v) => s + v, 0) / last50.length;
  if (avgLong === 0) return 0.5;
  const ratio = avgRecent / avgLong;
  return Math.min(ratio / 2.0, 1.0);
}

function scoreValuation(peRatio: number | null): number {
  if (peRatio === null) return 0.5;
  if (peRatio <= 0) return 0.2;
  if (peRatio >= 5 && peRatio <= 20) return 1.0;
  if (peRatio < 5) return 0.6;
  if (peRatio <= 30) return 0.7;
  if (peRatio <= 50) return 0.4;
  return 0.1;
}

function scoreMarketCapFactor(marketCap: number): number {
  if (marketCap <= 0) return 0.3;
  return Math.min(Math.max((Math.log10(marketCap) - 8) / 4, 0), 1.0);
}

function scoreRecentMomentum(changePercent: number): number {
  return Math.min(Math.max((changePercent + 2) / 6, 0), 1.0);
}

function computeCompositeScore(bd: ScoreBreakdown): number {
  return (
    bd.recoveryPotential * 25 +
    bd.momentum * 25 +
    bd.volumeConfirmation * 15 +
    bd.valuation * 15 +
    bd.marketCap * 10 +
    bd.recentMomentum * 10
  );
}

function generateReasoning(bd: ScoreBreakdown, pick: {
  drawdownPercent: number;
  peRatio: number | null;
}): string {
  const parts: string[] = [];

  if (bd.recoveryPotential >= 0.6)
    parts.push(`${pick.drawdownPercent.toFixed(0)}% below 52-week high`);
  if (bd.momentum >= 0.75) parts.push("bullish SMA trend");
  else if (bd.momentum >= 0.5) parts.push("price above SMA20");
  if (bd.volumeConfirmation >= 0.7)
    parts.push("strong volume accumulation");
  if (bd.valuation >= 0.8 && pick.peRatio !== null)
    parts.push(`attractive P/E of ${pick.peRatio.toFixed(1)}`);
  if (bd.marketCap >= 0.7) parts.push("large-cap stability");
  if (bd.recentMomentum >= 0.7) parts.push("positive recent momentum");

  return parts.length > 0
    ? parts.join(", ").replace(/^./, (s) => s.toUpperCase())
    : "Balanced upside potential across multiple factors";
}

// --- Data fetching helpers ---

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
      topPicksCache &&
      Date.now() - topPicksCache.fetchedAt < TOP_PICKS_TTL
    ) {
      return NextResponse.json(topPicksCache.data, {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // Step 1: Fetch all constituent lists
    const constituentResults = await Promise.allSettled(
      INDEX_CONFIGS.map((cfg) =>
        fetchConstituents(cfg.key, cfg.file, cfg.format)
      )
    );

    const symbolMap = new Map<string, string>();
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

    // Step 2: Fetch current quotes
    const quotes = await fetchBatchQuotes(allSymbols);

    // Step 3: Fetch historicals and compute preliminary scores
    const batchSize = 50;
    const prelimCandidates: {
      symbol: string;
      name: string;
      price: number;
      previousClose: number;
      changePercent: number;
      changeAmount: number;
      high52Week: number;
      drawdownPercent: number;
      sma5: number | null;
      sma20: number | null;
      volumeScore: number;
      prelimScore: number;
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
        if (!historicals || historicals.length < 20) continue;

        const closes = historicals.map((h) => parseFloat(h.close_price));
        const volumes = historicals.map((h) => h.volume);

        const high52Week = Math.max(
          ...historicals.map((h) => parseFloat(h.high_price))
        );
        if (high52Week <= 0) continue;

        const drawdownPercent = ((high52Week - price) / high52Week) * 100;
        // Must have at least 3% drawdown to have recovery potential
        if (drawdownPercent < 3) continue;

        const sma5Arr = computeSMA(closes, 5);
        const sma20Arr = computeSMA(closes, 20);
        const currentSma5 = sma5Arr[sma5Arr.length - 1];
        const currentSma20 = sma20Arr[sma20Arr.length - 1];

        const changeAmount = price - prevClose;
        const changePercent = (changeAmount / prevClose) * 100;

        // Preliminary score (4 factors without fundamentals)
        const recoveryScore = scoreRecoveryPotential(drawdownPercent);
        const momentumScore = scoreMomentum(price, currentSma5, currentSma20);
        const volScore = scoreVolume(volumes);
        const recentScore = scoreRecentMomentum(changePercent);

        const prelimScore =
          recoveryScore * 25 +
          momentumScore * 25 +
          volScore * 15 +
          recentScore * 10;

        prelimCandidates.push({
          symbol,
          name: symbolMap.get(symbol) || symbol,
          price,
          previousClose: prevClose,
          changePercent: Math.round(changePercent * 100) / 100,
          changeAmount: Math.round(changeAmount * 100) / 100,
          high52Week,
          drawdownPercent: Math.round(drawdownPercent * 100) / 100,
          sma5: currentSma5,
          sma20: currentSma20,
          volumeScore: volScore,
          prelimScore,
        });
      }
    }

    // Step 4: Sort by preliminary score and fetch fundamentals for top 100
    prelimCandidates.sort((a, b) => b.prelimScore - a.prelimScore);
    const topCandidates = prelimCandidates.slice(0, 100);

    const fundamentalsResults = await Promise.allSettled(
      topCandidates.map((c) => fetchFundamentals(c.symbol))
    );

    // Step 5: Final scoring with all 6 factors
    const picks: TopPick[] = [];
    for (let i = 0; i < topCandidates.length; i++) {
      const candidate = topCandidates[i];
      const fundResult = fundamentalsResults[i];
      const fundamentals =
        fundResult.status === "fulfilled" ? fundResult.value : null;

      const marketCap = fundamentals?.market_cap
        ? parseFloat(fundamentals.market_cap)
        : 0;
      const peRatio = fundamentals?.pe_ratio
        ? parseFloat(fundamentals.pe_ratio)
        : null;
      const dividendYield = fundamentals?.dividend_yield
        ? parseFloat(fundamentals.dividend_yield)
        : null;

      const scoreBreakdown: ScoreBreakdown = {
        recoveryPotential: scoreRecoveryPotential(candidate.drawdownPercent),
        momentum: scoreMomentum(
          candidate.price,
          candidate.sma5,
          candidate.sma20
        ),
        volumeConfirmation: candidate.volumeScore,
        valuation: scoreValuation(peRatio),
        marketCap: scoreMarketCapFactor(marketCap),
        recentMomentum: scoreRecentMomentum(candidate.changePercent),
      };

      const compositeScore = computeCompositeScore(scoreBreakdown);

      picks.push({
        rank: 0,
        symbol: candidate.symbol,
        name: candidate.name,
        price: candidate.price,
        previousClose: candidate.previousClose,
        changePercent: candidate.changePercent,
        changeAmount: candidate.changeAmount,
        high52Week: candidate.high52Week,
        drawdownPercent: candidate.drawdownPercent,
        marketCap,
        peRatio,
        dividendYield,
        sector: fundamentals?.sector || "Unknown",
        industry: fundamentals?.industry || "Unknown",
        compositeScore: Math.round(compositeScore * 10) / 10,
        scoreBreakdown,
        reasoning: generateReasoning(scoreBreakdown, {
          drawdownPercent: candidate.drawdownPercent,
          peRatio,
        }),
      });
    }

    // Sort by composite score and take top N
    picks.sort((a, b) => b.compositeScore - a.compositeScore);
    const topPicks = picks.slice(0, TOP_PICKS_COUNT);
    topPicks.forEach((pick, i) => {
      pick.rank = i + 1;
    });

    const response: TopPicksData = {
      picks: topPicks,
      totalScanned: allSymbols.length,
      totalCandidates: prelimCandidates.length,
      fetchedAt: new Date().toISOString(),
    };

    topPicksCache = { data: response, fetchedAt: Date.now() };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Top picks API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch top picks" },
      { status: 500 }
    );
  }
}
