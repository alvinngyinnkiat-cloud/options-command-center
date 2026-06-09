import { PnlValue } from "@/components/ui/PnlValue";
import { formatRiskCurrency, formatRiskPct } from "@/lib/risk/format";
import type { OpenRiskByStrategyRow } from "@/lib/risk/types";

interface RiskTablesProps {
  byStrategy: OpenRiskByStrategyRow[];
}

export function RiskTables({ byStrategy }: RiskTablesProps) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
        Open Risk By Strategy
      </h3>
      <div className="overflow-x-auto rounded-lg border border-terminal-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-terminal-border bg-terminal-elevated/60 text-left uppercase tracking-wider text-terminal-muted">
              <th className="px-3 py-2 font-medium">Strategy</th>
              <th className="px-3 py-2 font-medium text-right">Trades</th>
              <th className="px-3 py-2 font-medium text-right">Max Risk</th>
              <th className="px-3 py-2 font-medium text-right">My P/L</th>
              <th className="px-3 py-2 font-medium text-right">Risk %</th>
            </tr>
          </thead>
          <tbody>
            {byStrategy.map((row) => (
              <tr
                key={row.strategyKey}
                className="border-b border-terminal-border/40"
              >
                <td className="px-3 py-2 font-medium text-terminal-text">
                  {row.strategy}
                </td>
                <td className="px-3 py-2 font-mono text-right">
                  {row.openTrades}
                </td>
                <td className="px-3 py-2 font-mono text-right">
                  {formatRiskCurrency(row.totalMaxRisk)}
                </td>
                <td className="px-3 py-2 font-mono text-right">
                  <PnlValue value={row.totalCurrentPnl} className="inline" />
                </td>
                <td className="px-3 py-2 font-mono text-right text-terminal-muted">
                  {formatRiskPct(row.riskPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
