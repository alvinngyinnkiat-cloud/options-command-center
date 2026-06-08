import * as XLSX from "xlsx";
import type { FileDownloadPayload } from "./types";
import { buildBinaryDownload, timestampForFilename } from "./utils";
import { collectExportContext } from "./data-bundle";

function sheetWithTotals(
  headers: string[],
  rows: unknown[][],
  totalColumns: number[] = []
): XLSX.WorkSheet {
  const data = [headers, ...rows];
  if (totalColumns.length > 0 && rows.length > 0) {
    const totalRow = headers.map((_, colIdx) => {
      if (!totalColumns.includes(colIdx)) return "";
      const sum = rows.reduce((s, row) => {
        const val = Number(row[colIdx]);
        return s + (Number.isFinite(val) ? val : 0);
      }, 0);
      return colIdx === 0 ? "TOTAL" : sum;
    });
    data.push(totalRow);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: headers.length - 1 },
    }),
  };
  return ws;
}

export async function exportExcelWorkbook(): Promise<FileDownloadPayload> {
  const ctx = await collectExportContext();
  const wb = XLSX.utils.book_new();

  const holdings =
    ctx.mockHoldings.length > 0
      ? ctx.mockHoldings
      : ctx.portfolio.holdings.map((h) => ({ ...h, quantity: 1 }));

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      ["Ticker", "Asset Type", "Currency", "Shares", "Cost Basis", "Current Value SGD"],
      holdings.map((h) => [
        h.ticker,
        h.asset_type,
        h.currency,
        "quantity" in h ? h.quantity : 1,
        h.cost_basis ?? 0,
        h.market_value_sgd,
      ]),
      [5, 6]
    ),
    "Portfolio"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      [
        "Underlying",
        "Strategy",
        "Entry",
        "Expiry",
        "Contracts",
        "Premium",
        "Max Risk",
        "Current P/L",
        "Status",
      ],
      ctx.trades.trades.map((t) => [
        t.ticker,
        t.strategyLabel,
        t.entryDate,
        t.expirationDate,
        t.contracts,
        t.premiumPerContract,
        t.calculations.maxRisk,
        t.calculations.currentPnl,
        t.statusLabel,
      ]),
      [5, 6, 7]
    ),
    "Options Trades"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      ["Ticker", "Shares", "Cost Basis SGD", "Market Value SGD", "Unrealized P/L", "Weight %"],
      ctx.stocks.holdings.map((h) => [
        h.ticker,
        h.sharesHeld ?? "",
        h.totalInvestedSgd,
        h.currentValueSgd,
        h.profitLossSgd,
        h.allocationPct.toFixed(2),
      ]),
      [2, 3, 4]
    ),
    "Stock Tracker"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      ["Ticker", "Invested SGD", "Current Value SGD", "Unrealized P/L SGD", "Return %"],
      ctx.crypto.holdings.map((h) => [
        h.ticker,
        h.totalInvestedSgd,
        h.currentValueSgd,
        h.profitLossSgd,
        h.returnPct.toFixed(2),
      ]),
      [1, 2, 3]
    ),
    "Crypto Tracker"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      ["Ticker", "Entry", "Exit", "Strategy", "P/L", "Win/Loss", "Lesson"],
      ctx.journal.entries.map((e) => [
        e.ticker,
        e.entryDate,
        e.exitDate ?? "",
        e.strategyLabel ?? "",
        e.profitLoss ?? 0,
        e.winLoss ?? "",
        e.lessonLearned ?? "",
      ]),
      [4]
    ),
    "Trading Journal"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      ["Ticker", "Score", "Decision", "Strategy", "Support1", "Resistance1"],
      ctx.watchlist.rows.map((r) => [
        r.ticker,
        r.score?.totalScore ?? 0,
        r.score?.recommendation.decisionLabel ?? "",
        r.score?.recommendation.recommendedStrategy ?? "",
        r.supportResistance.support1 ?? "",
        r.supportResistance.resistance1 ?? "",
      ]),
      [1]
    ),
    "Scanner"
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetWithTotals(
      ["Ticker", "Strategy", "Max Risk", "Current P/L", "Risk %", "Status"],
      ctx.risk.openRiskByTicker.map((r) => [
        r.ticker,
        r.strategy,
        r.maxRisk,
        r.currentPnl,
        r.riskPct.toFixed(2),
        ctx.risk.tickerExposure.find((t) => t.tradeId === r.tradeId)?.statusLabel ?? "",
      ]),
      [2, 3]
    ),
    "Risk Dashboard"
  );

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return buildBinaryDownload(
    `investment-manager-${timestampForFilename()}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer
  );
}
