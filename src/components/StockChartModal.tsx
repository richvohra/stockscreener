"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  formatCurrency,
  formatPercent,
  formatMarketCap,
  formatVolume,
} from "@/lib/utils";

interface ChartPoint {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface ChartFundamentals {
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null;
  high52Weeks: number | null;
  low52Weeks: number | null;
  description: string | null;
}

interface CrossoverInfo {
  signal: "bullish" | "bearish" | null;
  periodsAgo: number | null;
}

interface Technicals {
  currentSma5: number | null;
  currentSma20: number | null;
  dailyCrossover: CrossoverInfo;
  weeklyCrossover: CrossoverInfo;
  smaPosition: "bullish" | "bearish" | null;
  priceVsSma20: number | null;
}

interface ChartData {
  symbol: string;
  span: string;
  points: ChartPoint[];
  sma5: (number | null)[];
  sma20: (number | null)[];
  currentPrice: number;
  previousClose: number;
  changeAmount: number;
  changePercent: number;
  technicals: Technicals;
  fundamentals: ChartFundamentals | null;
}

const SPANS = [
  { key: "day", label: "1D" },
  { key: "week", label: "1W" },
  { key: "month", label: "1M" },
  { key: "3month", label: "3M" },
  { key: "year", label: "1Y" },
  { key: "5year", label: "5Y" },
];

export function StockChartModal({
  symbol,
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) {
  const priceCanvasRef = useRef<HTMLCanvasElement>(null);
  const volumeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [span, setSpan] = useState("year");
  const [showSMA, setShowSMA] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: ChartPoint;
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fetch chart data
  const fetchChart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stocks/chart?symbol=${symbol}&span=${span}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ChartData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, span]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  // Shared chart layout constants (stable reference to avoid re-renders)
  const paddingRef = useRef({ top: 20, right: 60, bottom: 30, left: 10 });
  const padding = paddingRef.current;

  // Draw price chart with SMA overlays
  useEffect(() => {
    const canvas = priceCanvasRef.current;
    if (!canvas || !data || data.points.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const closes = data.points.map((p) => p.close);

    // Include SMA values in min/max calculation so lines stay in view
    const allPrices = [...closes];
    if (showSMA) {
      for (const v of data.sma5) if (v !== null) allPrices.push(v);
      for (const v of data.sma20) if (v !== null) allPrices.push(v);
    }

    const minPrice = Math.min(...allPrices) * 0.995;
    const maxPrice = Math.max(...allPrices) * 1.005;
    const priceRange = maxPrice - minPrice || 1;

    const firstClose = data.points[0].close;
    const lastClose = data.points[data.points.length - 1].close;
    const isUp = lastClose >= firstClose;
    const lineColor = isUp ? "#22c55e" : "#ef4444";
    const fillColor = isUp
      ? "rgba(34, 197, 94, 0.08)"
      : "rgba(239, 68, 68, 0.08)";

    const getX = (i: number) =>
      padding.left + (i / (data.points.length - 1)) * chartW;
    const getY = (price: number) =>
      padding.top + ((maxPrice - price) / priceRange) * chartH;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const price = maxPrice - (priceRange / gridLines) * i;
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`$${price.toFixed(2)}`, w - padding.right + 6, y + 4);
    }

    // Area fill
    ctx.beginPath();
    for (let i = 0; i < data.points.length; i++) {
      const x = getX(i);
      const y = getY(data.points[i].close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Price line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (let i = 0; i < data.points.length; i++) {
      const x = getX(i);
      const y = getY(data.points[i].close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // SMA overlays
    if (showSMA) {
      // SMA 5 - orange
      ctx.beginPath();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      let started = false;
      for (let i = 0; i < data.sma5.length; i++) {
        const val = data.sma5[i];
        if (val === null) continue;
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // SMA 20 - blue
      ctx.beginPath();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      started = false;
      for (let i = 0; i < data.sma20.length; i++) {
        const val = data.sma20[i];
        if (val === null) continue;
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Date labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    const dateCount = Math.min(6, data.points.length);
    for (let i = 0; i < dateCount; i++) {
      const idx = Math.floor(
        (i / (dateCount - 1)) * (data.points.length - 1)
      );
      const x = getX(idx);
      const d = new Date(data.points[idx].date);
      let label: string;
      if (span === "day") {
        label = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      } else if (span === "5year") {
        label = d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
      } else {
        label = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      ctx.fillText(label, x, h - 6);
    }
  }, [data, span, showSMA, padding]);

  // Draw volume bars
  useEffect(() => {
    const canvas = volumeCanvasRef.current;
    if (!canvas || !data || data.points.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const volPadding = { top: 4, right: 60, bottom: 0, left: 10 };
    const chartW = w - volPadding.left - volPadding.right;
    const chartH = h - volPadding.top - volPadding.bottom;

    const volumes = data.points.map((p) => p.volume);
    const maxVol = Math.max(...volumes) || 1;

    ctx.clearRect(0, 0, w, h);

    const barWidth = Math.max(1, chartW / data.points.length - 1);
    for (let i = 0; i < data.points.length; i++) {
      const x = volPadding.left + (i / (data.points.length - 1)) * chartW - barWidth / 2;
      const volH = (data.points[i].volume / maxVol) * chartH;
      const y = volPadding.top + chartH - volH;

      // Color based on close vs open
      const isGreen = data.points[i].close >= data.points[i].open;
      ctx.fillStyle = isGreen
        ? "rgba(34, 197, 94, 0.4)"
        : "rgba(239, 68, 68, 0.4)";
      ctx.fillRect(x, y, barWidth, volH);
    }

    // Volume label on right
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(formatVolume(maxVol), w - volPadding.right + 6, volPadding.top + 10);
  }, [data, padding]);

  // Handle mouse hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!data || data.points.length === 0 || !priceCanvasRef.current) return;

      const rect = priceCanvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartW = rect.width - padding.left - padding.right;

      const ratio = (mouseX - padding.left) / chartW;
      const idx = Math.round(ratio * (data.points.length - 1));
      if (idx >= 0 && idx < data.points.length) {
        const x =
          padding.left + (idx / (data.points.length - 1)) * chartW;
        const closes = data.points.map((p) => p.close);
        const allPrices = [...closes];
        if (showSMA) {
          for (const v of data.sma5) if (v !== null) allPrices.push(v);
          for (const v of data.sma20) if (v !== null) allPrices.push(v);
        }
        const minPrice = Math.min(...allPrices) * 0.995;
        const maxPrice = Math.max(...allPrices) * 1.005;
        const priceRange = maxPrice - minPrice || 1;
        const chartH = rect.height - padding.top - padding.bottom;
        const y =
          padding.top +
          ((maxPrice - data.points[idx].close) / priceRange) * chartH;
        setHoveredPoint({ point: data.points[idx], index: idx, x, y });
      }
    },
    [data, showSMA, padding]
  );

  const isUp = data ? data.changePercent >= 0 : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-5xl mx-4 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{symbol}</h2>
            {data && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.currentPrice)}
                </span>
                <span
                  className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                    isUp
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {formatPercent(data.changePercent)} today
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
            aria-label="Close"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Controls: span selector + SMA toggle */}
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-1">
            {SPANS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSpan(s.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  span === s.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
              showSMA
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            SMA 5/20
          </button>
        </div>

        {/* SMA Legend */}
        {showSMA && data && (
          <div className="flex items-center gap-4 px-6 pt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-amber-500 rounded" />
              <span>
                SMA 5{" "}
                {data.technicals.currentSma5 !== null && (
                  <span className="text-gray-700 font-medium">
                    {formatCurrency(data.technicals.currentSma5)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-blue-500 rounded" style={{ borderTop: "1px dashed #3b82f6" }} />
              <span>
                SMA 20{" "}
                {data.technicals.currentSma20 !== null && (
                  <span className="text-gray-700 font-medium">
                    {formatCurrency(data.technicals.currentSma20)}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Chart + Volume area */}
        <div
          className="relative mx-6 mt-3"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm z-10">
              {error}
            </div>
          )}

          {/* Price chart */}
          <div className="relative h-64">
            {data && data.points.length > 0 && (
              <>
                <canvas
                  ref={priceCanvasRef}
                  className="w-full h-full"
                />
                {/* Hover crosshair + tooltip */}
                {hoveredPoint && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 w-px bg-gray-300 pointer-events-none"
                      style={{ left: hoveredPoint.x }}
                    />
                    <div
                      className="absolute w-2.5 h-2.5 rounded-full border-2 border-white pointer-events-none"
                      style={{
                        left: hoveredPoint.x - 5,
                        top: hoveredPoint.y - 5,
                        backgroundColor: isUp ? "#22c55e" : "#ef4444",
                        boxShadow: "0 0 4px rgba(0,0,0,0.2)",
                      }}
                    />
                    <div
                      className="absolute bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none whitespace-nowrap z-20"
                      style={{
                        left: Math.min(
                          hoveredPoint.x - 60,
                          (priceCanvasRef.current?.getBoundingClientRect().width ?? 600) - 200
                        ),
                        top: Math.max(hoveredPoint.y - 65, 0),
                      }}
                    >
                      <div className="font-semibold">
                        {formatCurrency(hoveredPoint.point.close)}
                      </div>
                      <div className="opacity-70">
                        Vol: {formatVolume(hoveredPoint.point.volume)}
                      </div>
                      {showSMA && data.sma5[hoveredPoint.index] !== null && (
                        <div className="opacity-70">
                          <span className="text-amber-400">SMA5:</span>{" "}
                          {formatCurrency(data.sma5[hoveredPoint.index]!)}
                          {data.sma20[hoveredPoint.index] !== null && (
                            <>
                              {" "}
                              <span className="text-blue-400">SMA20:</span>{" "}
                              {formatCurrency(data.sma20[hoveredPoint.index]!)}
                            </>
                          )}
                        </div>
                      )}
                      <div className="opacity-60">
                        {new Date(hoveredPoint.point.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            ...(span === "day"
                              ? { hour: "numeric", minute: "2-digit" }
                              : {}),
                          }
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Volume bars */}
          <div className="relative h-16 border-t border-gray-100">
            {data && data.points.length > 0 && (
              <>
                <canvas
                  ref={volumeCanvasRef}
                  className="w-full h-full"
                />
                {/* Volume crosshair line */}
                {hoveredPoint && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-gray-300 pointer-events-none"
                    style={{ left: hoveredPoint.x }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Technical Analysis Panel */}
        {data?.technicals && (
          <div className="px-6 pt-4 pb-3 border-t border-gray-100 mt-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Technical Analysis
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* SMA Position */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">SMA Trend</p>
                {data.technicals.smaPosition ? (
                  <p
                    className={`font-bold text-sm ${
                      data.technicals.smaPosition === "bullish"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.technicals.smaPosition === "bullish"
                      ? "Bullish"
                      : "Bearish"}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      (5 &gt; 20)
                    </span>
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">N/A</p>
                )}
              </div>

              {/* Price vs SMA 20 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Price vs SMA 20</p>
                {data.technicals.priceVsSma20 !== null ? (
                  <p
                    className={`font-bold text-sm ${
                      data.technicals.priceVsSma20 >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.technicals.priceVsSma20 >= 0 ? "+" : ""}
                    {data.technicals.priceVsSma20.toFixed(2)}%
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      {data.technicals.priceVsSma20 >= 0 ? "above" : "below"}
                    </span>
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">N/A</p>
                )}
              </div>

              {/* Daily Crossover */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Daily 5/20 Cross</p>
                {data.technicals.dailyCrossover.signal ? (
                  <p
                    className={`font-bold text-sm ${
                      data.technicals.dailyCrossover.signal === "bullish"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.technicals.dailyCrossover.signal === "bullish"
                      ? "Golden Cross"
                      : "Death Cross"}
                    {data.technicals.dailyCrossover.periodsAgo !== null && (
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        {data.technicals.dailyCrossover.periodsAgo === 0
                          ? "today"
                          : `${data.technicals.dailyCrossover.periodsAgo}d ago`}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">No recent cross</p>
                )}
              </div>

              {/* Weekly Crossover */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Weekly 5/20 Cross</p>
                {data.technicals.weeklyCrossover.signal ? (
                  <p
                    className={`font-bold text-sm ${
                      data.technicals.weeklyCrossover.signal === "bullish"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {data.technicals.weeklyCrossover.signal === "bullish"
                      ? "Golden Cross"
                      : "Death Cross"}
                    {data.technicals.weeklyCrossover.periodsAgo !== null && (
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        {data.technicals.weeklyCrossover.periodsAgo === 0
                          ? "this week"
                          : `${data.technicals.weeklyCrossover.periodsAgo}w ago`}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">No recent cross</p>
                )}
              </div>
            </div>

            {/* TA Summary */}
            {data.technicals.dailyCrossover.signal ||
            data.technicals.weeklyCrossover.signal ? (
              <div
                className={`mt-3 px-3 py-2 rounded-lg text-xs ${
                  (data.technicals.dailyCrossover.signal === "bullish" &&
                    data.technicals.weeklyCrossover.signal === "bullish") ||
                  (data.technicals.dailyCrossover.signal === "bullish" &&
                    !data.technicals.weeklyCrossover.signal) ||
                  (!data.technicals.dailyCrossover.signal &&
                    data.technicals.weeklyCrossover.signal === "bullish")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : (data.technicals.dailyCrossover.signal === "bearish" &&
                          data.technicals.weeklyCrossover.signal ===
                            "bearish") ||
                        (data.technicals.dailyCrossover.signal === "bearish" &&
                          !data.technicals.weeklyCrossover.signal) ||
                        (!data.technicals.dailyCrossover.signal &&
                          data.technicals.weeklyCrossover.signal === "bearish")
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {(() => {
                  const daily = data.technicals.dailyCrossover.signal;
                  const weekly = data.technicals.weeklyCrossover.signal;
                  if (daily === "bullish" && weekly === "bullish")
                    return "Strong bullish signal: Both daily and weekly 5/20 SMAs show golden crosses. Momentum is aligned across timeframes.";
                  if (daily === "bearish" && weekly === "bearish")
                    return "Strong bearish signal: Both daily and weekly 5/20 SMAs show death crosses. Downward momentum across timeframes.";
                  if (daily === "bullish" && weekly === "bearish")
                    return "Mixed signal: Daily golden cross suggests short-term recovery, but weekly death cross indicates broader downtrend. Use caution.";
                  if (daily === "bearish" && weekly === "bullish")
                    return "Mixed signal: Daily death cross suggests short-term pullback within a broader weekly uptrend. Could be a buying opportunity or trend reversal.";
                  if (daily === "bullish")
                    return "Daily golden cross detected. Short-term momentum is turning bullish. Watch for weekly confirmation.";
                  if (daily === "bearish")
                    return "Daily death cross detected. Short-term momentum is turning bearish. Watch for weekly confirmation.";
                  if (weekly === "bullish")
                    return "Weekly golden cross detected. Longer-term momentum is bullish. Strong signal for medium-term trades.";
                  if (weekly === "bearish")
                    return "Weekly death cross detected. Longer-term momentum is bearish. Consider risk management.";
                  return "";
                })()}
              </div>
            ) : null}
          </div>
        )}

        {/* Fundamentals */}
        {data?.fundamentals && (
          <div className="px-6 pb-5 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Fundamentals
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {data.fundamentals.marketCap && (
                <div>
                  <p className="text-gray-400 text-xs">Market Cap</p>
                  <p className="font-semibold text-gray-900">
                    {formatMarketCap(data.fundamentals.marketCap)}
                  </p>
                </div>
              )}
              {data.fundamentals.peRatio && (
                <div>
                  <p className="text-gray-400 text-xs">P/E Ratio</p>
                  <p className="font-semibold text-gray-900">
                    {data.fundamentals.peRatio.toFixed(1)}
                  </p>
                </div>
              )}
              {data.fundamentals.high52Weeks && (
                <div>
                  <p className="text-gray-400 text-xs">52W High</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(data.fundamentals.high52Weeks)}
                  </p>
                </div>
              )}
              {data.fundamentals.low52Weeks && (
                <div>
                  <p className="text-gray-400 text-xs">52W Low</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(data.fundamentals.low52Weeks)}
                  </p>
                </div>
              )}
              {data.fundamentals.dividendYield && (
                <div>
                  <p className="text-gray-400 text-xs">Div Yield</p>
                  <p className="font-semibold text-gray-900">
                    {data.fundamentals.dividendYield.toFixed(2)}%
                  </p>
                </div>
              )}
              {data.fundamentals.sector && (
                <div>
                  <p className="text-gray-400 text-xs">Sector</p>
                  <p className="font-semibold text-gray-900">
                    {data.fundamentals.sector}
                  </p>
                </div>
              )}
              {data.fundamentals.industry && (
                <div className="sm:col-span-2">
                  <p className="text-gray-400 text-xs">Industry</p>
                  <p className="font-semibold text-gray-900">
                    {data.fundamentals.industry}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
