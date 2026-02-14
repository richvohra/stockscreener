import { NextResponse } from "next/server";
import {
  ROBINHOOD_HISTORICALS_URL,
  ROBINHOOD_QUOTES_URL,
  ROBINHOOD_FUNDAMENTALS_URL,
} from "@/lib/constants";
import { computeSMA, detectCrossover } from "@/lib/stocks";
import type { CrossoverSignal } from "@/lib/stocks";

export const dynamic = "force-dynamic";

interface HistPoint {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const span = searchParams.get("span") || "year";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  // Map span to interval
  const intervalMap: Record<string, string> = {
    day: "5minute",
    week: "10minute",
    month: "day",
    "3month": "day",
    year: "day",
    "5year": "week",
  };
  const interval = intervalMap[span] || "day";

  try {
    // Fetch historicals, quote, fundamentals, AND weekly historicals in parallel
    const [histRes, quoteRes, fundRes, weeklyHistRes] = await Promise.all([
      fetch(
        `${ROBINHOOD_HISTORICALS_URL}${symbol}/?interval=${interval}&span=${span}`,
        { cache: "no-store" }
      ),
      fetch(`${ROBINHOOD_QUOTES_URL}${symbol}/`, { cache: "no-store" }),
      fetch(`${ROBINHOOD_FUNDAMENTALS_URL}${symbol}/`, { cache: "no-store" }),
      // Always fetch weekly data for weekly crossover analysis
      fetch(
        `${ROBINHOOD_HISTORICALS_URL}${symbol}/?interval=week&span=year`,
        { cache: "no-store" }
      ),
    ]);

    if (!histRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch historical data: ${histRes.status}` },
        { status: histRes.status }
      );
    }

    const histData = await histRes.json();
    const quoteData = quoteRes.ok ? await quoteRes.json() : null;
    const fundData = fundRes.ok ? await fundRes.json() : null;
    const weeklyHistData = weeklyHistRes.ok
      ? await weeklyHistRes.json()
      : null;

    const parseHistoricals = (
      raw: {
        begins_at: string;
        close_price: string;
        open_price: string;
        high_price: string;
        low_price: string;
        volume: number;
      }[]
    ): HistPoint[] =>
      raw.map((h) => ({
        date: h.begins_at,
        close: parseFloat(h.close_price),
        open: parseFloat(h.open_price),
        high: parseFloat(h.high_price),
        low: parseFloat(h.low_price),
        volume: h.volume,
      }));

    const points = parseHistoricals(histData.historicals || []);

    // Compute SMAs on the chart points
    const closes = points.map((p) => p.close);
    const sma5 = computeSMA(closes, 5);
    const sma20 = computeSMA(closes, 20);

    // Detect daily crossover
    const dailyCrossover = detectCrossover(sma5, sma20);

    // Compute weekly SMAs and crossover
    let weeklyCrossover: { signal: CrossoverSignal; weeksAgo: number | null } =
      { signal: null, weeksAgo: null };
    if (weeklyHistData?.historicals) {
      const weeklyPoints = parseHistoricals(weeklyHistData.historicals);
      const weeklyCloses = weeklyPoints.map((p) => p.close);
      const weeklySma5 = computeSMA(weeklyCloses, 5);
      const weeklySma20 = computeSMA(weeklyCloses, 20);
      const wc = detectCrossover(weeklySma5, weeklySma20);
      weeklyCrossover = { signal: wc.signal, weeksAgo: wc.daysAgo };
    }

    const currentPrice = quoteData
      ? parseFloat(quoteData.last_trade_price)
      : points.length > 0
        ? points[points.length - 1].close
        : 0;

    const previousClose = quoteData
      ? parseFloat(
          quoteData.adjusted_previous_close || quoteData.previous_close
        )
      : 0;

    // Current SMA values for display
    const currentSma5 = sma5[sma5.length - 1];
    const currentSma20 = sma20[sma20.length - 1];

    return NextResponse.json(
      {
        symbol,
        span,
        interval,
        points,
        sma5,
        sma20,
        currentPrice,
        previousClose,
        changeAmount: currentPrice - previousClose,
        changePercent:
          previousClose > 0
            ? ((currentPrice - previousClose) / previousClose) * 100
            : 0,
        technicals: {
          currentSma5,
          currentSma20,
          dailyCrossover: {
            signal: dailyCrossover.signal,
            periodsAgo: dailyCrossover.daysAgo,
          },
          weeklyCrossover: {
            signal: weeklyCrossover.signal,
            periodsAgo: weeklyCrossover.weeksAgo,
          },
          smaPosition:
            currentSma5 !== null && currentSma20 !== null
              ? currentSma5 > currentSma20
                ? "bullish"
                : "bearish"
              : null,
          priceVsSma20:
            currentSma20 !== null
              ? ((currentPrice - currentSma20) / currentSma20) * 100
              : null,
        },
        fundamentals: fundData
          ? {
              sector: fundData.sector || null,
              industry: fundData.industry || null,
              marketCap: fundData.market_cap
                ? parseFloat(fundData.market_cap)
                : null,
              peRatio: fundData.pe_ratio
                ? parseFloat(fundData.pe_ratio)
                : null,
              dividendYield: fundData.dividend_yield
                ? parseFloat(fundData.dividend_yield)
                : null,
              high52Weeks: fundData.high_52_weeks
                ? parseFloat(fundData.high_52_weeks)
                : null,
              low52Weeks: fundData.low_52_weeks
                ? parseFloat(fundData.low_52_weeks)
                : null,
              description: fundData.description || null,
            }
          : null,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Chart API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
