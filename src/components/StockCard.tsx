import type { StockQuote } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function StockCard({ stock }: { stock: StockQuote }) {
  const intensityClass = getIntensityClass(stock.changePercent);

  return (
    <div
      className={`rounded-lg border p-4 transition-all hover:shadow-md ${intensityClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold truncate">{stock.symbol}</p>
          <p className="text-xs opacity-70 truncate">{stock.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">
            {formatCurrency(stock.price)}
          </p>
          <p className="text-xs font-medium">
            {formatPercent(stock.changePercent)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs opacity-60">
        <span>Prev: {formatCurrency(stock.previousClose)}</span>
        <span>+{formatCurrency(stock.changeAmount)}</span>
      </div>
    </div>
  );
}

function getIntensityClass(percent: number): string {
  if (percent >= 10) return "bg-green-200 text-green-900 border-green-300";
  if (percent >= 7) return "bg-green-100 text-green-800 border-green-200";
  if (percent >= 5) return "bg-green-50 text-green-800 border-green-200";
  return "bg-white text-green-700 border-green-100";
}
