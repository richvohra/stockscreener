import type { GameState } from "./types";

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export function formatStartTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function getStatusColor(state: GameState): string {
  switch (state) {
    case "in":
      return "text-green-600";
    case "post":
      return "text-gray-500";
    case "pre":
      return "text-blue-600";
  }
}

export function getStatusBgColor(state: GameState): string {
  switch (state) {
    case "in":
      return "bg-green-100 text-green-700";
    case "post":
      return "bg-gray-100 text-gray-500";
    case "pre":
      return "bg-blue-100 text-blue-700";
  }
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // Market open 9:30 AM - 4:00 PM ET
  return totalMinutes >= 570 && totalMinutes < 960;
}

export function getGainIntensity(percent: number): string {
  if (percent >= 10) return "bg-green-200 text-green-900 border-green-300";
  if (percent >= 7) return "bg-green-150 text-green-800 border-green-250";
  if (percent >= 5) return "bg-green-100 text-green-800 border-green-200";
  return "bg-green-50 text-green-700 border-green-100";
}

export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatDrawdown(value: number): string {
  return `-${value.toFixed(1)}%`;
}
