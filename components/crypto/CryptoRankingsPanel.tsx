import type { CryptoRankedHolding } from "@/lib/crypto/allocation";
import { formatSGD } from "@/lib/utils";

interface CryptoRankingsPanelProps {
  rankings: CryptoRankedHolding[];
}

export function CryptoRankingsPanel({ rankings }: CryptoRankingsPanelProps) {
  const top = rankings.slice(0, 10);
  const topHolding = top[0] ?? null;
  const secondToFifth = top.slice(1, 5);
  const sixthToTenth = top.slice(5, 10);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Coin Rankings
        </h3>
        {rankings.length === 0 ? (
          <p className="text-xs text-terminal-muted">No coin holdings yet.</p>
        ) : (
          <ul className="space-y-2">
            {rankings.map((h) => (
              <li
                key={h.ticker}
                className="flex items-center justify-between gap-2 rounded border border-terminal-border/50 px-2 py-1.5 text-xs"
              >
                <span className="font-mono font-semibold text-terminal-text">
                  {h.rank}. {h.ticker}
                </span>
                <span className="font-mono text-terminal-muted">
                  {h.allocationPct.toFixed(1)}% · {formatSGD(h.currentValueSgd)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[10px] text-terminal-muted">
          Includes stablecoins (USDT, USDC, etc.). Exchange cash is never ranked.
        </p>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Holdings by Tier
        </h3>
        <TierBlock label="Top Holding" holdings={topHolding ? [topHolding] : []} />
        <TierBlock label="2nd–5th Holdings" holdings={secondToFifth} />
        <TierBlock label="6th–10th Holdings" holdings={sixthToTenth} />
        {rankings.length > 10 && (
          <TierBlock
            label="Others"
            holdings={rankings.slice(10)}
          />
        )}
      </div>
    </div>
  );
}

function TierBlock({
  label,
  holdings,
}: {
  label: string;
  holdings: CryptoRankedHolding[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      {holdings.length === 0 ? (
        <p className="text-xs text-terminal-muted">—</p>
      ) : (
        <ul className="space-y-1">
          {holdings.map((h) => (
            <li
              key={`${label}-${h.ticker}`}
              className="flex justify-between gap-2 text-xs font-mono"
            >
              <span className="text-terminal-text">
                {h.rank}. {h.ticker}
              </span>
              <span className="text-terminal-muted">
                {formatSGD(h.currentValueSgd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
