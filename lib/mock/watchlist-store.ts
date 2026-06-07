import {
  buildDefaultCategoryScannerRows,
  buildMockScannerRow,
  buildMockScannerRows,
} from "./watchlist-scanner";
import type { WatchlistScannerRow } from "@/lib/watchlist/types";

export interface WatchlistImportEntry {
  ticker: string;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  notes: string | null;
}

const extraEntries = new Map<string, WatchlistImportEntry>();
const srOverrides = new Map<string, WatchlistImportEntry>();

export function getWatchlistImportEntry(ticker: string): WatchlistImportEntry | undefined {
  return extraEntries.get(ticker) ?? srOverrides.get(ticker);
}

export function upsertWatchlistImportEntry(entry: WatchlistImportEntry): void {
  const key = entry.ticker.toUpperCase();
  extraEntries.set(key, { ...entry, ticker: key });
}

export function upsertWatchlistSrOverride(entry: WatchlistImportEntry): void {
  const key = entry.ticker.toUpperCase();
  srOverrides.set(key, { ...entry, ticker: key });
}

export function setWatchlistImportEntries(entries: WatchlistImportEntry[]): void {
  extraEntries.clear();
  srOverrides.clear();
  for (const entry of entries) {
    extraEntries.set(entry.ticker.toUpperCase(), {
      ...entry,
      ticker: entry.ticker.toUpperCase(),
    });
  }
}

export function resetWatchlistStore(): void {
  extraEntries.clear();
  srOverrides.clear();
}

function applyEntry(row: WatchlistScannerRow): WatchlistScannerRow {
  const entry = getWatchlistImportEntry(row.ticker);
  if (!entry) return row;
  return {
    ...row,
    supportResistance: {
      ...row.supportResistance,
      support1: entry.support1 ?? row.supportResistance.support1,
      support2: entry.support2 ?? row.supportResistance.support2,
      resistance1: entry.resistance1 ?? row.supportResistance.resistance1,
      resistance2: entry.resistance2 ?? row.supportResistance.resistance2,
      notes: entry.notes ?? row.supportResistance.notes,
    },
  };
}

export function buildMockScannerRowsWithStore(
  tickers?: string[]
): WatchlistScannerRow[] {
  const base = tickers
    ? buildMockScannerRows(tickers)
    : buildDefaultCategoryScannerRows();
  const baseTickers = new Set(base.map((r) => r.ticker));

  const extraRows = [...extraEntries.values()]
    .filter((e) => !baseTickers.has(e.ticker))
    .map((e, index) => {
      const row = buildMockScannerRow(
        e.ticker,
        base.length + index,
        undefined,
        "Pullbacks"
      );
      return {
        ...row,
        supportResistance: {
          ...row.supportResistance,
          support1: e.support1,
          support2: e.support2,
          resistance1: e.resistance1,
          resistance2: e.resistance2,
          notes: e.notes,
        },
      };
    });

  return [...base, ...extraRows].map(applyEntry);
}

export function getWatchlistImportEntries(): WatchlistImportEntry[] {
  const merged = new Map<string, WatchlistImportEntry>();
  for (const row of buildMockScannerRowsWithStore()) {
    merged.set(row.ticker, {
      ticker: row.ticker,
      support1: row.supportResistance.support1,
      support2: row.supportResistance.support2,
      resistance1: row.supportResistance.resistance1,
      resistance2: row.supportResistance.resistance2,
      notes: row.supportResistance.notes,
    });
  }
  return [...merged.values()];
}
