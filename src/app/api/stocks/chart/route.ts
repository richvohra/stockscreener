import { NextResponse } from "next/server";
import {
  ROBINHOOD_HISTORICALS_URL,
  ROBINHOOD_QUOTES_URL,
  ROBINHOOD_FUNDAMENTALS_URL,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

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
    // Fetch historicals, quote, and fundamentals in parallel
    const [histRes, quoteRes, fundRes] = await Promise.all([
      fetch(
        `${ROBINHOOD_HISTORICALS_URL}${symbol}/?interval=${interval}&span=${span}`,
        { cache: "no-store" }
      ),
      fetch(`${ROBINHOOD_QUOTES_URL}${symbol}/`, { cache: "no-store" }),
      fetch(`${ROBINHOOD_FUNDAMENTALS_URL}${symbol}/`, { cache: "no-store" }),
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

    const points = (histData.historicals || []).map(
      (h: {
        begins_at: string;
        close_price: string;
        open_price: string;
        high_price: string;
        low_price: string;
        volume: number;
      }) => ({
        date: h.begins_at,
        close: parseFloat(h.close_price),
        open: parseFloat(h.open_price),
        high: parseFloat(h.high_price),
        low: parseFloat(h.low_price),
        volume: h.volume,
      })
    );

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

    return NextResponse.json(
      {
        symbol,
        span,
        interval,
        points,
        currentPrice,
        previousClose,
        changeAmount: currentPrice - previousClose,
        changePercent:
          previousClose > 0
            ? ((currentPrice - previousClose) / previousClose) * 100
            : 0,
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
