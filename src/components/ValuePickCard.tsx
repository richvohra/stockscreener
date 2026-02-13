import type { ValuePick } from "@/lib/types";
import {
  formatCurrency,
  formatPercent,
  formatMarketCap,
  formatDrawdown,
} from "@/lib/utils";

export function ValuePickCard({
  pick,
  onClickChart,
}: {
  pick: ValuePick;
  onClickChart?: (symbol: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md ${
        onClickChart ? "cursor-pointer" : ""
      }`}
      onClick={() => onClickChart?.(pick.symbol)}
    >
      {/* Header: Symbol + Price */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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

      {/* Drawdown badge */}
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          {formatDrawdown(pick.drawdownPercent)} from high
        </span>
        <span className="text-xs text-gray-400">
          52w: {formatCurrency(pick.high52Week)}
        </span>
      </div>

      {/* Fundamentals row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
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
          <p className="text-gray-400 font-medium">Div Yield</p>
          <p className="text-gray-700 font-semibold">
            {pick.dividendYield !== null
              ? `${pick.dividendYield.toFixed(2)}%`
              : "N/A"}
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
