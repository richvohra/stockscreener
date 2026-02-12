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
      return "text-green-400";
    case "post":
      return "text-zinc-500";
    case "pre":
      return "text-blue-400";
  }
}

export function getStatusBgColor(state: GameState): string {
  switch (state) {
    case "in":
      return "bg-green-500/20 text-green-400";
    case "post":
      return "bg-zinc-700/50 text-zinc-400";
    case "pre":
      return "bg-blue-500/20 text-blue-400";
  }
}
