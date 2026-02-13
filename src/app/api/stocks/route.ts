import { NextResponse } from "next/server";
import { INDEX_CONFIGS, MIN_GAIN_PERCENT, MIN_STOCK_PRICE } from "@/lib/constants";
import { fetchConstituents, fetchBatchQuotes } from "@/lib/stocks";
import type {
  IndexConstituent,
  RobinhoodQuote,
  StockQuote,
  IndexData,
  StockTrackerData,
} from "@/lib/types";
import { isMarketOpen } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    if (price < MIN_STOCK_PRICE) continue;

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
