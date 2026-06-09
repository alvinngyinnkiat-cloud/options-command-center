export default function WatchlistLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-terminal-elevated" />
          <div className="h-4 w-96 max-w-full rounded bg-terminal-elevated/70" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-terminal-elevated" />
          <div className="h-8 w-32 rounded bg-terminal-elevated" />
        </div>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/30 p-4">
        <div className="h-16 rounded bg-terminal-elevated/60" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-terminal-border bg-terminal-elevated/30 px-3 py-4"
          >
            <div className="h-3 w-20 rounded bg-terminal-elevated" />
            <div className="mt-3 h-4 w-full rounded bg-terminal-elevated/60" />
            <div className="mt-2 h-3 w-16 rounded bg-terminal-elevated/50" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-terminal-border p-4">
        <div className="mb-4 h-8 w-64 rounded bg-terminal-elevated" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded bg-terminal-elevated/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
