"use client";

import { useState } from "react";
import type { IndexData } from "@/lib/types";
import { StockCard } from "./StockCard";

const INDEX_COLORS: Record<string, string> = {
  sp500: "from-blue-600 to-blue-700",
  nasdaq100: "from-purple-600 to-purple-700",
  dowjones: "from-amber-600 to-amber-700",
  russell2000: "from-rose-600 to-rose-700",
};

export function IndexSection({ index }: { index: IndexData }) {
  const [collapsed, setCollapsed] = useState(false);
  const gradient = INDEX_COLORS[index.name] || "from-gray-600 to-gray-700";
  const hasStocks = index.stocks.length > 0;

  return (
    <section className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-5 py-3 rounded-t-lg bg-gradient-to-r ${gradient} text-white cursor-pointer ${
          collapsed || !hasStocks ? "rounded-b-lg" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{index.displayName}</h2>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {index.totalConstituents} stocks
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasStocks && (
            <span className="text-sm font-semibold bg-white/25 px-2.5 py-0.5 rounded-full">
              {index.stocks.length} up 3%+
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {!collapsed && hasStocks && (
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {index.stocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        </div>
      )}

      {!collapsed && !hasStocks && (
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-6 text-center text-gray-400 text-sm">
          No stocks up 3%+ in this index today
        </div>
      )}
    </section>
  );
}
