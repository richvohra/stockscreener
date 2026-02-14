import type { TopPick } from "@/lib/types";
import {
  formatCurrency,
  formatPercent,
  formatMarketCap,
  getScoreColor,
} from "@/lib/utils";

const FACTOR_LABELS = [
  { key: "recoveryPotential" as const, label: "Recovery", color: "bg-purple-400" },
  { key: "momentum" as const, label: "Momentum", color: "bg-blue-400" },
  { key: "volumeConfirmation" as const, label: "Volume", color: "bg-cyan-400" },
  { key: "valuation" as const, label: "Value", color: "bg-green-400" },
  { key: "marketCap" as const, label: "Size", color: "bg-amber-400" },
  { key: "recentMomentum" as const, label: "Daily", color: "bg-rose-400" },
];

function getRankStyle(rank: number): string {
  if (rank === 1) return "bg-amber-400 text-amber-900";
  if (rank === 2) return "bg-gray-300 text-gray-700";
  if (rank === 3) return "bg-amber-600 text-amber-100";
  return "bg-gray-100 text-gray-600";
}

export function TopPickCard({
  pick,
  onClickChart,
}: {
  pick: TopPick;
  onClickChart?: (symbol: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md ${
        onClickChart ? "cursor-pointer" : ""
      }`}
      onClick={() => onClickChart?.(pick.symbol)}
    >
      {/* Header: Rank + Symbol + Price */}
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${getRankStyle(
            pick.rank
          )}`}
        >
          {pick.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold truncate text-gray-900">
                {pick.symbol}
              </p>
              <p className="text-xs text-gray-500 truncate">{pick.name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(pick.price)}
              </p>
              <p
                className={`text-xs font-medium ${
                  pick.changePercent >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercent(pick.changePercent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-500">Score</span>
          <span className="text-xs font-bold text-gray-700">
            {pick.compositeScore.toFixed(0)}/100
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getScoreColor(
              pick.compositeScore
            )}`}
            style={{ width: `${pick.compositeScore}%` }}
          />
        </div>
      </div>

      {/* Factor breakdown mini bars */}
      <div className="mt-2.5 grid grid-cols-6 gap-1">
        {FACTOR_LABELS.map((f) => {
          const value = pick.scoreBreakdown[f.key];
          return (
            <div key={f.key} className="text-center">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                <div
                  className={`h-full rounded-full ${f.color}`}
                  style={{ width: `${value * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 leading-none">
                {f.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reasoning */}
      <p className="mt-2 text-xs text-gray-600 leading-relaxed">
        {pick.reasoning}
      </p>

      {/* Fundamentals row */}
      <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-400 font-medium">Mkt Cap</p>
          <p className="text-gray-700 font-semibold">
            {pick.marketCap > 0 ? formatMarketCap(pick.marketCap) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 font-medium">P/E</p>
          <p className="text-gray-700 font-semibold">
            {pick.peRatio !== null ? pick.peRatio.toFixed(1) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 font-medium">Drawdown</p>
          <p className="text-red-600 font-semibold">
            -{pick.drawdownPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Sector */}
      <div className="mt-2 text-xs text-gray-400 truncate">
        {pick.sector} &middot; {pick.industry}
      </div>
    </div>
  );
}
