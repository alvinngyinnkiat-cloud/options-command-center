import {
  getMockPortfolioHoldings,
  setMockPortfolioHoldings,
  resetMockPortfolioHoldings,
} from "@/lib/mock/portfolio-holdings-store";
import { getMockTrades, setMockTrades, resetMockTrades } from "@/lib/mock/trades-store";
import {
  getMockCryptoHoldings,
  resetMockCryptoHoldings,
} from "@/lib/mock/crypto-store";
import { getMockJournalEntries, resetMockJournalEntries } from "@/lib/mock/journal-store";
import { getMockStockEtfHoldings } from "@/lib/mock/stock-etf-store";
import {
  getWatchlistImportEntries,
  setWatchlistImportEntries,
  resetWatchlistStore,
} from "@/lib/mock/watchlist-store";
import { MOCK_RISK_SETTINGS } from "@/lib/mock/risk-settings";
import { MOCK_PORTFOLIO_OVERRIDE } from "@/lib/mock/portfolio";
import { collectExportContext } from "./data-bundle";
import type { FileDownloadPayload, FullBackupBundle } from "./types";
import { BACKUP_VERSION } from "./constants";
import { buildTextDownload, timestampForFilename } from "./utils";
import type { ImportEntityType } from "./types";
import { buildImportPreview } from "./validate";

export async function buildFullBackupBundle(): Promise<FullBackupBundle> {
  const ctx = await collectExportContext();
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    dataSource: ctx.dataSource,
    portfolio: {
      metrics: ctx.portfolio,
      holdings: getMockPortfolioHoldings(),
      override: MOCK_PORTFOLIO_OVERRIDE,
    },
    watchlists: ctx.watchlist.rows.map((r) => ({
      ticker: r.ticker,
      watchlistId: r.watchlistId,
      notes: r.supportResistance.notes,
    })),
    supportResistance: ctx.watchlist.rows.map((r) => ({
      ticker: r.ticker,
      watchlistId: r.watchlistId,
      support1: r.supportResistance.support1,
      support2: r.supportResistance.support2,
      resistance1: r.supportResistance.resistance1,
      resistance2: r.supportResistance.resistance2,
      notes: r.supportResistance.notes,
      updateDate: r.supportResistance.updateDate,
    })),
    trades: ctx.rawTrades,
    journal: ctx.rawJournal,
    settings: ctx.settings,
    goals: ctx.goals,
    crypto: ctx.rawCrypto,
    stockEtf: ctx.rawStockEtf,
    scannerResults: ctx.watchlist.rows.map((r) => ({
      ticker: r.ticker,
      score: r.score?.totalScore ?? null,
      decision: r.score?.recommendation.decisionLabel ?? null,
      strategy: r.score?.recommendation.recommendedStrategy ?? null,
    })),
    weekendReview: {
      status: ctx.weekend.status,
      history: ctx.weekend.history,
      summary: ctx.weekend.summary,
    },
  };
}

export async function exportFullBackupJson(): Promise<FileDownloadPayload> {
  const bundle = await buildFullBackupBundle();
  const json = JSON.stringify(bundle, null, 2);
  return buildTextDownload(
    `investment-manager-full-backup-${timestampForFilename()}.json`,
    "application/json",
    json
  );
}

export async function restoreFullBackupJson(
  jsonText: string
): Promise<{ success: boolean; message: string }> {
  let bundle: FullBackupBundle;
  try {
    bundle = JSON.parse(jsonText) as FullBackupBundle;
  } catch {
    return { success: false, message: "Invalid JSON backup file." };
  }

  if (bundle.version !== BACKUP_VERSION) {
    return {
      success: false,
      message: `Unsupported backup version: ${bundle.version}`,
    };
  }

  resetMockPortfolioHoldings();
  resetMockTrades();
  resetMockCryptoHoldings();
  resetMockJournalEntries();
  resetWatchlistStore();

  const portfolioSection = bundle.portfolio as {
    holdings?: Parameters<typeof setMockPortfolioHoldings>[0];
  } | null;
  if (Array.isArray(portfolioSection?.holdings)) {
    setMockPortfolioHoldings(portfolioSection.holdings);
  }

  if (Array.isArray(bundle.trades)) {
    setMockTrades(bundle.trades);
  }

  if (Array.isArray(bundle.supportResistance)) {
    setWatchlistImportEntries(
      (
        bundle.supportResistance as {
          ticker: string;
          support1?: number | null;
          support2?: number | null;
          resistance1?: number | null;
          resistance2?: number | null;
          notes?: string | null;
        }[]
      ).map((sr) => ({
        ticker: sr.ticker,
        support1: sr.support1 ?? null,
        support2: sr.support2 ?? null,
        resistance1: sr.resistance1 ?? null,
        resistance2: sr.resistance2 ?? null,
        notes: sr.notes ?? null,
      }))
    );
  }

  return {
    success: true,
    message: `Restored backup from ${bundle.exportedAt} (${bundle.dataSource} source).`,
  };
}

export function buildExistingKeys(
  entityType: ImportEntityType,
  existingData: Awaited<ReturnType<typeof collectExportContext>>
): Set<string> {
  switch (entityType) {
    case "portfolio_holdings":
      return new Set(
        existingData.mockHoldings.map((h) => `${h.ticker}|${h.asset_type}`)
      );
    case "options_trades":
      return new Set(
        existingData.trades.trades.map(
          (t) => `${t.ticker}|${t.entryDate}|${t.expirationDate}|${t.strategy}`
        )
      );
    case "crypto":
      return new Set(existingData.crypto.holdings.map((h) => h.ticker));
    case "watchlist":
      return new Set(existingData.watchlist.rows.map((r) => r.ticker));
  }
}

export async function previewCsvImport(
  entityType: ImportEntityType,
  csvText: string
) {
  const { parseCsvText } = await import("./csv-export");
  const rows = parseCsvText(csvText);
  const ctx = await collectExportContext();
  const existingKeys = buildExistingKeys(entityType, ctx);
  return buildImportPreview(entityType, rows, existingKeys);
}
