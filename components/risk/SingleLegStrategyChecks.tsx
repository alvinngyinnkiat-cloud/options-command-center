"use client";

import { formatRiskCurrency } from "@/lib/risk/format";
import type { SingleLegRiskChecks } from "@/lib/risk/single-leg-checks";
import { NAKED_CALL_UNLIMITED_RISK_MESSAGE } from "@/lib/trades/strategy-meta";
import { cn } from "@/lib/utils";

interface SingleLegStrategyChecksProps {
  checks: SingleLegRiskChecks;
  usdCashAvailable: number;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        ok
          ? "bg-profit/15 text-profit"
          : "bg-loss/15 text-loss"
      )}
    >
      {label}
    </span>
  );
}

export function SingleLegStrategyChecks({
  checks,
  usdCashAvailable,
}: SingleLegStrategyChecksProps) {
  const hasSellPut = checks.sellPutChecks.length > 0;
  const hasSellCall = checks.sellCallChecks.length > 0;

  if (!hasSellPut && !hasSellCall) {
    return (
      <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Sell Put / Sell Call Risk Checks
        </h2>
        <p className="text-xs text-terminal-muted">
          No open Sell Put or Sell Call trades. USD cash available:{" "}
          {formatRiskCurrency(usdCashAvailable)}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-4">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Sell Put / Sell Call Risk Checks
        </h2>
        <p className="mt-1 text-[11px] text-terminal-muted">
          USD cash {formatRiskCurrency(usdCashAvailable)} · Future strategies
          require manual selection
        </p>
      </div>

      {hasSellPut && (
        <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 p-3 space-y-2">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
            Cash-Secured Put Check
          </h3>
          {checks.sellPutChecks.map((check) => (
            <div
              key={check.tradeId}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-mono font-semibold">{check.ticker}</span>
                <span className="text-terminal-muted">
                  {" "}
                  · {check.contracts} ct · strike {check.shortPutStrike ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-terminal-muted">
                  Required {formatRiskCurrency(check.requiredCash)}
                </span>
                <StatusBadge
                  ok={check.canOpen}
                  label={check.canOpen ? "Can Open" : "Insufficient Cash"}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSellCall && (
        <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 p-3 space-y-2">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
            Covered Call Check
          </h3>
          {checks.sellCallChecks.map((check) => (
            <div key={check.tradeId} className="space-y-1 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold">{check.ticker}</span>
                  <span className="text-terminal-muted">
                    {" "}
                    · {check.contracts} ct · {check.coverage}
                  </span>
                </div>
                {check.isNaked ? (
                  <StatusBadge ok={false} label="Naked — Critical" />
                ) : (
                  <StatusBadge
                    ok={check.canOpen}
                    label={check.canOpen ? "Can Open" : "Insufficient Shares"}
                  />
                )}
              </div>
              {!check.isNaked && (
                <p className="font-mono text-terminal-muted">
                  Required {check.requiredShares} shares · Owned{" "}
                  {check.sharesOwned ?? 0}
                </p>
              )}
              {check.isNaked && (
                <p className="text-loss font-medium">
                  {NAKED_CALL_UNLIMITED_RISK_MESSAGE}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
