import type { Metadata } from "next";
import { StockTracker } from "@/components/StockTracker";

export const metadata: Metadata = {
  title: "Stock Tracker - Real-Time Market Gainers",
  description:
    "Real-time stock tracker showing S&P 500, Nasdaq 100, Dow Jones, and Russell 2000 stocks up 3% or more today",
  openGraph: {
    title: "Stock Tracker - Real-Time Market Gainers",
    description:
      "Real-time stock tracker showing major index gainers updated every 5 seconds",
    type: "website",
  },
};

export default function StocksPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <StockTracker />
    </main>
  );
}
