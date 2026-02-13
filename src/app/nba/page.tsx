import type { Metadata } from "next";
import { Scoreboard } from "@/components/Scoreboard";

export const metadata: Metadata = {
  title: "NBA Live Scores",
  description: "Live NBA game scores, updated every 30 seconds",
  openGraph: {
    title: "NBA Live Scores",
    description: "Live NBA game scores, updated every 30 seconds",
    type: "website",
  },
};

export default function NBAPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Scoreboard />
    </main>
  );
}
