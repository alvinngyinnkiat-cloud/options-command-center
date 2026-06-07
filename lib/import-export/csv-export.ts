import Papa from "papaparse";
import type { CsvExportEntity, FileDownloadPayload } from "./types";
import { buildTextDownload, timestampForFilename } from "./utils";
import { collectExportContext } from "./data-bundle";

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  return lines.join("\n");
}

export async function exportCsvEntity(
  entity: CsvExportEntity
): Promise<FileDownloadPayload> {
  const ctx = await collectExportContext();
  const stamp = timestampForFilename();

  switch (entity) {
    case "portfolio_holdings": {
      const holdings =
        ctx.mockHoldings.length > 0
          ? ctx.mockHoldings
          : ctx.portfolio.holdings.map((h) => ({ ...h, quantity: 1 }));
      const csv = rowsToCsv(
        ["Ticker", "Asset Type", "Currency", "Shares", "Cost Basis", "Current Value"],
        holdings.map((h) => [
          h.ticker,
          h.asset_type,
          h.currency,
          "quantity" in h ? h.quantity : 1,
          h.cost_basis ?? "",
          h.market_value_native,
        ])
      );
      return buildTextDownload(
        `portfolio-holdings-${stamp}.csv`,
        "text/csv",
        csv
      );
    }
    case "options_trades": {
      const csv = rowsToCsv(
        [
          "Underlying",
          "Strategy",
          "Entry Date",
          "Expiry Date",
          "Contracts",
          "Strikes",
          "Premium",
          "Max Risk",
          "Status",
        ],
        ctx.trades.trades.map((t) => [
          t.ticker,
          t.strategyLabel,
          t.entryDate,
          t.expirationDate,
          t.contracts,
          t.strikesDisplay,
          t.premiumPerContract,
          t.calculations.maxRisk,
          t.status,
        ])
      );
      return buildTextDownload(`options-trades-${stamp}.csv`, "text/csv", csv);
    }
    case "crypto": {
      const csv = rowsToCsv(
        ["Ticker", "Invested Amount SGD", "Current Value SGD"],
        ctx.crypto.holdings.map((h) => [
          h.ticker,
          h.totalInvestedSgd,
          h.currentValueSgd,
        ])
      );
      return buildTextDownload(`crypto-holdings-${stamp}.csv`, "text/csv", csv);
    }
    case "watchlist": {
      const csv = rowsToCsv(
        ["Ticker", "Support1", "Support2", "Resistance1", "Resistance2", "Notes"],
        ctx.watchlist.rows.map((r) => [
          r.ticker,
          r.supportResistance.support1 ?? "",
          r.supportResistance.support2 ?? "",
          r.supportResistance.resistance1 ?? "",
          r.supportResistance.resistance2 ?? "",
          r.supportResistance.notes ?? "",
        ])
      );
      return buildTextDownload(`watchlist-${stamp}.csv`, "text/csv", csv);
    }
    case "scanner_results": {
      const csv = rowsToCsv(
        [
          "Ticker",
          "Score",
          "Decision",
          "Strategy",
          "Action",
          "Support1",
          "Resistance1",
        ],
        ctx.watchlist.rows.map((r) => [
          r.ticker,
          r.score?.totalScore ?? "",
          r.score?.recommendation.decisionLabel ?? "",
          r.score?.recommendation.recommendedStrategy ?? "",
          r.score?.recommendation.actionLabel ?? "",
          r.supportResistance.support1 ?? "",
          r.supportResistance.resistance1 ?? "",
        ])
      );
      return buildTextDownload(`scanner-results-${stamp}.csv`, "text/csv", csv);
    }
    case "trading_journal": {
      const csv = rowsToCsv(
        [
          "Ticker",
          "Entry Date",
          "Exit Date",
          "Strategy",
          "P/L",
          "Win/Loss",
          "Lesson Learned",
        ],
        ctx.journal.entries.map((e) => [
          e.ticker,
          e.entryDate,
          e.exitDate ?? "",
          e.strategyLabel ?? "",
          e.profitLoss ?? "",
          e.winLoss ?? "",
          e.lessonLearned ?? "",
        ])
      );
      return buildTextDownload(`trading-journal-${stamp}.csv`, "text/csv", csv);
    }
    case "risk_dashboard": {
      const csv = rowsToCsv(
        ["Ticker", "Strategy", "Contracts", "Max Risk", "Current P/L", "Risk %"],
        ctx.risk.openRiskByTicker.map((r) => [
          r.ticker,
          r.strategy,
          r.contracts,
          r.maxRisk,
          r.currentPnl,
          r.riskPct.toFixed(2),
        ])
      );
      return buildTextDownload(`risk-dashboard-${stamp}.csv`, "text/csv", csv);
    }
    case "reports": {
      const summary = ctx.trades.summary;
      const csv = rowsToCsv(
        ["Metric", "Value"],
        [
          ["Open Trades", summary.openTrades],
          ["Closed Trades", summary.closedTrades],
          ["Win Rate %", summary.winRate.toFixed(1)],
          ["Total Open Risk", summary.totalOpenRisk],
          ["Realized P/L", summary.realizedPnl],
          ["Current P/L", summary.currentPnl],
          ["Portfolio Value", ctx.portfolio.portfolioValue],
          ["Available Risk Capacity", ctx.portfolio.availableRiskCapacity],
        ]
      );
      return buildTextDownload(`reports-summary-${stamp}.csv`, "text/csv", csv);
    }
  }
}

export function parseCsvText(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).trim() !== "")
  );
}
