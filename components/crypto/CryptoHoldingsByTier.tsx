import type { CryptoTierGroup } from "@/lib/crypto/allocation";
import { formatSGD } from "@/lib/utils";

interface CryptoHoldingsByTierProps {
  tierGroups: CryptoTierGroup[];
}

export function CryptoHoldingsByTier({ tierGroups }: CryptoHoldingsByTierProps) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Holdings by Tier
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tierGroups.map((tier) => (
          <TierBlock key={tier.label} tier={tier} />
        ))}
      </div>
      <p className="mt-4 text-[10px] text-terminal-muted">
        Ranked by current SGD value. Exchange cash is grouped under Others.
        Stablecoins rank with other coin holdings.
      </p>
    </div>
  );
}

function TierBlock({ tier }: { tier: CryptoTierGroup }) {
  return (
    <div className="rounded-md border border-terminal-border/50 bg-terminal-elevated/20 p-3 min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
          {tier.label}
        </p>
        <span className="font-mono text-xs text-terminal-text tabular-nums">
          {tier.percent.toFixed(1)}%
        </span>
      </div>
      <p className="mb-2 font-mono text-sm font-semibold text-terminal-text tabular-nums break-words">
        {formatSGD(tier.value)}
      </p>
      {tier.holdings.length === 0 ? (
        <p className="text-xs text-terminal-muted">—</p>
      ) : (
        <ul className="space-y-1">
          {tier.holdings.map((h) => (
            <li
              key={`${tier.label}-${h.ticker}`}
              className="flex justify-between gap-2 text-xs font-mono"
            >
              <span className="text-terminal-text truncate">
                {h.rank}. {h.ticker}
              </span>
              <span className="text-terminal-muted tabular-nums shrink-0">
                {formatSGD(h.currentValueSgd)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
