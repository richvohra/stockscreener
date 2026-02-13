"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { formatCurrency, formatPercent, formatMarketCap } from "@/lib/utils";

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

interface ChartData {
  symbol: string;
  span: string;
  points: ChartPoint[];
  currentPrice: number;
  previousClose: number;
  changeAmount: number;
  changePercent: number;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [span, setSpan] = useState("year");
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: ChartPoint;
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

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
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
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const closes = data.points.map((p) => p.close);
    const minPrice = Math.min(...closes) * 0.995;
    const maxPrice = Math.max(...closes) * 1.005;
    const priceRange = maxPrice - minPrice || 1;

    const firstClose = data.points[0].close;
    const lastClose = data.points[data.points.length - 1].close;
    const isUp = lastClose >= firstClose;
    const lineColor = isUp ? "#22c55e" : "#ef4444";
    const fillColor = isUp
      ? "rgba(34, 197, 94, 0.08)"
      : "rgba(239, 68, 68, 0.08)";

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

      // Price labels
      const price = maxPrice - (priceRange / gridLines) * i;
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`$${price.toFixed(2)}`, w - padding.right + 6, y + 4);
    }

    // Area fill
    ctx.beginPath();
    for (let i = 0; i < data.points.length; i++) {
      const x =
        padding.left + (i / (data.points.length - 1)) * chartW;
      const y =
        padding.top +
        ((maxPrice - data.points[i].close) / priceRange) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(
      padding.left + chartW,
      padding.top + chartH
    );
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (let i = 0; i < data.points.length; i++) {
      const x =
        padding.left + (i / (data.points.length - 1)) * chartW;
      const y =
        padding.top +
        ((maxPrice - data.points[i].close) / priceRange) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Date labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    const dateCount = Math.min(6, data.points.length);
    for (let i = 0; i < dateCount; i++) {
      const idx = Math.floor(
        (i / (dateCount - 1)) * (data.points.length - 1)
      );
      const x =
        padding.left + (idx / (data.points.length - 1)) * chartW;
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
  }, [data, span]);

  // Handle mouse hover on canvas
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!data || data.points.length === 0 || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const padding = { top: 20, right: 60, bottom: 30, left: 10 };
      const chartW = rect.width - padding.left - padding.right;

      const ratio = (mouseX - padding.left) / chartW;
      const idx = Math.round(ratio * (data.points.length - 1));
      if (idx >= 0 && idx < data.points.length) {
        const x =
          padding.left + (idx / (data.points.length - 1)) * chartW;
        const closes = data.points.map((p) => p.close);
        const minPrice = Math.min(...closes) * 0.995;
        const maxPrice = Math.max(...closes) * 1.005;
        const priceRange = maxPrice - minPrice || 1;
        const chartH = rect.height - padding.top - padding.bottom;
        const y =
          padding.top +
          ((maxPrice - data.points[idx].close) / priceRange) * chartH;
        setHoveredPoint({ point: data.points[idx], x, y });
      }
    },
    [data]
  );

  const isUp = data
    ? data.changePercent >= 0
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-4xl mx-4 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
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

        {/* Span selector */}
        <div className="flex items-center gap-1 px-6 pt-4">
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

        {/* Chart area */}
        <div className="relative h-80 mx-6 mt-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
              {error}
            </div>
          )}
          {data && data.points.length > 0 && (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
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
                    className="absolute bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none whitespace-nowrap"
                    style={{
                      left: Math.min(
                        hoveredPoint.x - 60,
                        (canvasRef.current?.getBoundingClientRect().width ?? 600) - 160
                      ),
                      top: Math.max(hoveredPoint.y - 45, 0),
                    }}
                  >
                    <div className="font-semibold">
                      {formatCurrency(hoveredPoint.point.close)}
                    </div>
                    <div className="opacity-70">
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

        {/* Fundamentals */}
        {data?.fundamentals && (
          <div className="px-6 pb-5 pt-4 border-t border-gray-100 mt-4">
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
