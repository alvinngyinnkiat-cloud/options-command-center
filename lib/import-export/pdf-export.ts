import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FileDownloadPayload, PdfReportType } from "./types";
import { buildBinaryDownload, timestampForFilename, todayStamp } from "./utils";
import { buildCapitalLiquidityCheck } from "@/lib/risk/capital-liquidity";
import {
  calculateMyPnL,
  calculateTotalTradePnL,
} from "@/lib/trades/pnl-allocation";
import { sumClientClosedPnl } from "@/lib/trades/summary";
import {
  buildTickerPerformanceReport,
  buildTickerPositionSummaries,
} from "@/lib/ticker-positions/aggregate";
import { mapEnrichedToDbRow } from "@/lib/stocks-etfs/build-tab-data";
import { collectExportContext } from "./data-bundle";

function fmt(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}%`;
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Investment Manager", 14, 12);
  doc.setFontSize(11);
  doc.text(title, 14, 20);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(subtitle, 14, 26);
  }
  doc.setTextColor(30, 30, 30);
}

function opportunityTable(
  doc: jsPDF,
  startY: number,
  title: string,
  rows: { ticker: string; totalScore: number; recommendedStrategy: string; primaryReason: string }[]
) {
  doc.setFontSize(11);
  doc.text(title, 14, startY);
  autoTable(doc, {
    startY: startY + 4,
    head: [["Ticker", "Score", "Strategy", "Reason"]],
    body: rows.map((r) => [
      r.ticker,
      String(r.totalScore),
      r.recommendedStrategy,
      r.primaryReason.slice(0, 60),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 120] },
    margin: { left: 14, right: 14 },
  });
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

export async function exportPdfReport(
  reportType: PdfReportType
): Promise<FileDownloadPayload> {
  const ctx = await collectExportContext();
  const doc = new jsPDF();
  const date = todayStamp();

  switch (reportType) {
    case "weekend_market_review": {
      addHeader(
        doc,
        "Weekend Market Review",
        `Generated ${date} · ${ctx.weekend.status.tickerCount} tickers`
      );
      let y = 36;
      const { opportunities, summary } = ctx.weekend;
      doc.setFontSize(10);
      doc.text(
        `Bull Put: ${summary.bullPutCandidates} · Bear Call: ${summary.bearCallCandidates} · Iron Condor: ${summary.ironCondorCandidates} · No Trade: ${summary.noTradeCount}`,
        14,
        y
      );
      y += 10;
      y = opportunityTable(doc, y, "Top Bull Put Opportunities", opportunities.bullPut);
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y = opportunityTable(doc, y, "Top Bear Call Opportunities", opportunities.bearCall);
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y = opportunityTable(doc, y, "Top Iron Condor Opportunities", opportunities.ironCondor);
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      y = opportunityTable(doc, y, "No Trade List", opportunities.noTrade);
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text("Support / Resistance Notes", 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Ticker", "S1", "S2", "R1", "R2", "Notes"]],
        body: ctx.weekend.reviewStatusRows.slice(0, 12).map((r) => [
          r.ticker,
          r.support1 ?? "",
          r.support2 ?? "",
          r.resistance1 ?? "",
          r.resistance2 ?? "",
          (r.analystNotes ?? "").slice(0, 40),
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(
        `Weekend Summary: ${summary.updatedThisWeekend} updated this weekend, ${summary.needsReview} need review.`,
        14,
        finalY
      );
      break;
    }
    case "portfolio_report": {
      addHeader(doc, "Portfolio Report", `As of ${date}`);
      let y = 36;
      doc.setFontSize(10);
      doc.text(`Portfolio Value: $${ctx.portfolio.portfolioValue.toLocaleString()} SGD`, 14, y);
      y += 7;
      doc.text(`Cash: $${ctx.portfolio.cashValue.toLocaleString()} · Stocks: $${ctx.portfolio.stocksValue.toLocaleString()} · ETFs: $${ctx.portfolio.etfsValue.toLocaleString()} · Crypto: $${ctx.portfolio.cryptoValue.toLocaleString()}`, 14, y);
      y += 12;
      autoTable(doc, {
        startY: y,
        head: [["Asset Class", "Value SGD", "Allocation %"]],
        body: ctx.portfolio.assetAllocation.map((a) => [
          a.name,
          a.value.toLocaleString(),
          `${a.percent.toFixed(1)}%`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.text("Portfolio Growth (Daily Snapshots)", 14, y);
      const perf = ctx.portfolioHistory.performance;
      autoTable(doc, {
        startY: y + 4,
        head: [["Period", "Change SGD", "Change %"]],
        body: [
          ["Weekly", fmt(perf.weeklyChange), fmtPct(perf.weeklyChangePct)],
          ["Monthly", fmt(perf.monthlyChange), fmtPct(perf.monthlyChangePct)],
          ["Quarterly", fmt(perf.quarterlyChange), fmtPct(perf.quarterlyChangePct)],
          ["YTD", fmt(perf.ytdChange), fmtPct(perf.ytdChangePct)],
          ["All Time", fmt(perf.allTimeChange), fmtPct(perf.allTimeChangePct)],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.text("Goals Progress (Latest Snapshot)", 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Goal", "Current", "Target", "Progress %"]],
        body: [
          [
            ctx.goals.portfolioProgress.label,
            ctx.goals.portfolioProgress.current.toLocaleString(),
            ctx.goals.portfolioProgress.target.toLocaleString(),
            `${ctx.goals.portfolioProgress.progressPercent.toFixed(1)}%`,
          ],
          [
            ctx.goals.passiveProgress.label,
            ctx.goals.passiveProgress.current.toLocaleString(),
            ctx.goals.passiveProgress.target.toLocaleString(),
            `${ctx.goals.passiveProgress.progressPercent.toFixed(1)}%`,
          ],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      break;
    }
    case "trading_performance": {
      const closed = ctx.trades.trades.filter((t) => t.status === "closed");
      const wins = closed.filter(
        (t) => calculateMyPnL(t, calculateTotalTradePnL(t)) > 0
      );
      const losses = closed.filter(
        (t) => calculateMyPnL(t, calculateTotalTradePnL(t)) <= 0
      );
      const grossWin = wins.reduce(
        (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
        0
      );
      const grossLoss = Math.abs(
        losses.reduce(
          (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
          0
        )
      );
      const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin;
      const expectancy =
        closed.length > 0
          ? closed.reduce(
              (s, t) => s + calculateMyPnL(t, calculateTotalTradePnL(t)),
              0
            ) / closed.length
          : 0;
      const sorted = [...closed].sort(
        (a, b) =>
          calculateMyPnL(b, calculateTotalTradePnL(b)) -
          calculateMyPnL(a, calculateTotalTradePnL(a))
      );
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const clientClosedPnl = sumClientClosedPnl(closed);

      addHeader(doc, "Trading Performance Report", `Generated ${date} · My P/L only`);
      autoTable(doc, {
        startY: 36,
        head: [["Metric", "Value"]],
        body: [
          ["Total Trades", String(ctx.trades.trades.length)],
          ["Closed Trades", String(closed.length)],
          ["Win Rate (My P/L)", `${ctx.trades.summary.winRate.toFixed(1)}%`],
          ["My Unrealized P/L", `$${ctx.trades.summary.myCurrentPnl.toFixed(0)}`],
          ["My Realized P/L", `$${ctx.trades.summary.myRealizedPnl.toFixed(0)}`],
          ["Profit Factor (My P/L)", profitFactor.toFixed(2)],
          ["Expectancy (My P/L)", `$${expectancy.toFixed(0)}`],
          [
            "Best Trade (My Share)",
            best
              ? `${best.ticker} $${calculateMyPnL(best, calculateTotalTradePnL(best)).toFixed(0)}`
              : "—",
          ],
          [
            "Worst Trade (My Share)",
            worst
              ? `${worst.ticker} $${calculateMyPnL(worst, calculateTotalTradePnL(worst)).toFixed(0)}`
              : "—",
          ],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      const y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.text("Strategy Breakdown (My P/L)", 14, y);
      const byStrategy = new Map<string, { count: number; pnl: number }>();
      for (const t of ctx.trades.trades) {
        const key = t.strategyLabel;
        const cur = byStrategy.get(key) ?? { count: 0, pnl: 0 };
        cur.count++;
        cur.pnl += calculateMyPnL(t, calculateTotalTradePnL(t));
        byStrategy.set(key, cur);
      }
      autoTable(doc, {
        startY: y + 4,
        head: [["Strategy", "Trades", "My P/L"]],
        body: [...byStrategy.entries()].map(([strategy, v]) => [
          strategy,
          String(v.count),
          `$${v.pnl.toFixed(0)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      const stockRows = ctx.stocks.holdings.map((h) =>
        mapEnrichedToDbRow(h)
      );
      const tickerSummaries = buildTickerPositionSummaries(
        ctx.trades.trades,
        stockRows
      );
      const tickerReport = buildTickerPerformanceReport(tickerSummaries);
      let tickerY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 12;
      if (tickerY > 230) {
        doc.addPage();
        tickerY = 20;
      }
      doc.text("Top Performing Tickers (My P/L)", 14, tickerY);
      autoTable(doc, {
        startY: tickerY + 4,
        head: [["Ticker", "Total P/L", "ROI %", "Premium"]],
        body: tickerReport.topPerformers.map((s) => [
          s.ticker,
          `$${s.totalPnl.toFixed(0)}`,
          `${s.roiPct.toFixed(1)}%`,
          `$${s.totalPremiumCollected.toFixed(0)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      tickerY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;
      doc.text("Premium Collected By Ticker", 14, tickerY);
      autoTable(doc, {
        startY: tickerY + 4,
        head: [["Ticker", "Premium Collected"]],
        body: tickerReport.premiumByTicker.slice(0, 10).map((r) => [
          r.ticker,
          `$${r.premiumCollected.toFixed(0)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      const clientY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.text("Client Profit Sharing Summary", 14, clientY);
      autoTable(doc, {
        startY: clientY + 4,
        head: [["Metric", "Value"]],
        body: [
          ["Client Unrealized P/L", `$${ctx.trades.summary.clientUnrealizedPnl.toFixed(0)}`],
          ["Client Realized P/L", `$${ctx.trades.summary.clientRealizedPnl.toFixed(0)}`],
          ["Client P/L Owed (Open)", `$${ctx.trades.summary.clientPnlOwed.toFixed(0)}`],
          ["Client Closed P/L", `$${clientClosedPnl.toFixed(0)}`],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [80, 80, 80] },
        margin: { left: 14, right: 14 },
      });
      break;
    }
    case "risk_report": {
      const liq = buildCapitalLiquidityCheck(ctx.risk.capitalLiquidity, 0);
      addHeader(doc, "Risk Report", `Generated ${date}`);
      autoTable(doc, {
        startY: 36,
        head: [["Metric", "Value"]],
        body: [
          ["Open Risk", `$${ctx.risk.summary.currentOpenRisk.toLocaleString()}`],
          ["Liquidity Ratio", `${(liq.liquidityRatio * 100).toFixed(1)}%`],
          ["Emergency Buffer", `$${liq.emergencyBuffer.toLocaleString()}`],
          ["Trade Eligible", liq.tradeEligible ? "Yes" : "No"],
          ["Can Close All Positions", liq.canCloseAllPositions ? "Yes" : "No"],
          ["Stress Test", liq.stressTest.status.toUpperCase()],
          ["Capital Utilization", `${liq.capitalUtilizationPct.toFixed(1)}%`],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      const y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      doc.text("Open Risk by Ticker", 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Ticker", "Strategy", "Max Risk", "Risk %", "My P/L"]],
        body: ctx.risk.openRiskByTicker.map((r) => [
          r.ticker,
          r.strategy,
          `$${r.maxRisk.toLocaleString()}`,
          `${r.riskPct.toFixed(2)}%`,
          `$${r.myCurrentPnl.toFixed(0)}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 120] },
        margin: { left: 14, right: 14 },
      });
      break;
    }
  }

  const arrayBuffer = doc.output("arraybuffer");
  return buildBinaryDownload(
    `${reportType}-${timestampForFilename()}.pdf`,
    "application/pdf",
    arrayBuffer
  );
}
