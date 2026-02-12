export function NoGames() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">🏀</div>
      <h2 className="text-xl font-semibold text-zinc-300 mb-2">
        No Games Today
      </h2>
      <p className="text-zinc-500 text-sm max-w-sm">
        There are no NBA games scheduled for today. Check back tomorrow for live
        scores and updates.
      </p>
    </div>
  );
}
