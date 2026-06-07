import type {
  AssetType,
  CurrencyCode,
  StrategyType,
  TradeStatus,
} from "@/types/database";
import {
  CRYPTO_HEADERS,
  OPTIONS_TRADES_HEADERS,
  PORTFOLIO_HOLDINGS_HEADERS,
  WATCHLIST_HEADERS,
} from "./constants";
import type { ImportEntityType, ImportPreviewResult } from "./types";
import {
  normalizeHeader,
  parseDate,
  parseNumber,
} from "./utils";

const ASSET_TYPES = new Set<AssetType>(["stock", "option", "etf", "other"]);
const CURRENCIES = new Set<CurrencyCode>(["SGD", "USD"]);
const STRATEGIES = new Set<StrategyType>([
  "bull_put_spread",
  "bear_call_spread",
  "iron_condor",
]);
const STATUSES = new Set<TradeStatus>([
  "open",
  "closing",
  "closed",
  "managed",
  "rolled",
]);

const STRATEGY_ALIASES: Record<string, StrategyType> = {
  "bull put": "bull_put_spread",
  "bull put spread": "bull_put_spread",
  bull_put_spread: "bull_put_spread",
  "bear call": "bear_call_spread",
  "bear call spread": "bear_call_spread",
  bear_call_spread: "bear_call_spread",
  "iron condor": "iron_condor",
  iron_condor: "iron_condor",
};

function getField(
  row: Record<string, string>,
  ...aliases: string[]
): string | undefined {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normalizeHeader(k), v])
  );
  for (const alias of aliases) {
    const value = normalized[normalizeHeader(alias)];
    if (value != null && value.trim() !== "") return value.trim();
  }
  return undefined;
}

export function normalizeStrategy(value: string): StrategyType | null {
  const key = value.trim().toLowerCase().replace(/_/g, " ");
  return STRATEGY_ALIASES[key] ?? STRATEGY_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function normalizeStatus(value: string): TradeStatus | null {
  const key = value.trim().toLowerCase() as TradeStatus;
  return STATUSES.has(key) ? key : null;
}

export function normalizeAssetType(value: string): AssetType | null {
  const key = value.trim().toLowerCase() as AssetType;
  return ASSET_TYPES.has(key) ? key : null;
}

export function normalizeCurrency(value: string): CurrencyCode | null {
  const key = value.trim().toUpperCase() as CurrencyCode;
  return CURRENCIES.has(key) ? key : null;
}

export interface ParsedPortfolioRow {
  ticker: string;
  assetType: AssetType;
  currency: CurrencyCode;
  shares: number;
  costBasis: number | null;
  currentValue: number;
}

export interface ParsedOptionsRow {
  underlying: string;
  strategy: StrategyType;
  entryDate: string;
  expiryDate: string;
  contracts: number;
  strikes: string;
  premium: number;
  maxRisk: number;
  status: TradeStatus;
  shortStrikePut: number | null;
  longStrikePut: number | null;
  shortStrikeCall: number | null;
  longStrikeCall: number | null;
}

export interface ParsedCryptoRow {
  ticker: string;
  investedAmountSgd: number;
  currentValueSgd: number;
}

export interface ParsedWatchlistRow {
  ticker: string;
  support1: number | null;
  support2: number | null;
  resistance1: number | null;
  resistance2: number | null;
  notes: string | null;
}

export function parseStrikes(strikes: string): {
  shortStrikePut: number | null;
  longStrikePut: number | null;
  shortStrikeCall: number | null;
  longStrikeCall: number | null;
} {
  const parts = strikes.split(/[|/]/).map((p) => p.trim()).filter(Boolean);
  const nums = parts.flatMap((p) =>
    p.split(/[-\s]+/).map((n) => parseNumber(n)).filter((n): n is number => n != null)
  );

  if (nums.length >= 4) {
    return {
      shortStrikePut: nums[0],
      longStrikePut: nums[1],
      shortStrikeCall: nums[2],
      longStrikeCall: nums[3],
    };
  }
  if (nums.length === 2) {
    return {
      shortStrikePut: nums[0],
      longStrikePut: nums[1],
      shortStrikeCall: null,
      longStrikeCall: null,
    };
  }
  return {
    shortStrikePut: nums[0] ?? null,
    longStrikePut: null,
    shortStrikeCall: null,
    longStrikeCall: null,
  };
}

function validatePortfolioRow(
  row: Record<string, string>,
  rowNumber: number
): { parsed?: ParsedPortfolioRow; errors: string[] } {
  const errors: string[] = [];
  const ticker = getField(row, "Ticker")?.toUpperCase();
  const assetTypeRaw = getField(row, "Asset Type");
  const currencyRaw = getField(row, "Currency");
  const shares = parseNumber(getField(row, "Shares"));
  const costBasis = parseNumber(getField(row, "Cost Basis"));
  const currentValue = parseNumber(getField(row, "Current Value"));

  if (!ticker) errors.push("Ticker is required");
  const assetType = assetTypeRaw ? normalizeAssetType(assetTypeRaw) : null;
  if (!assetType) errors.push("Valid Asset Type required (stock, option, etf, other)");
  const currency = currencyRaw ? normalizeCurrency(currencyRaw) : null;
  if (!currency) errors.push("Valid Currency required (SGD, USD)");
  if (shares == null || shares <= 0) errors.push("Shares must be a positive number");
  if (currentValue == null || currentValue < 0) errors.push("Current Value must be a number");

  if (errors.length || !ticker || !assetType || !currency || shares == null || currentValue == null) {
    return { errors };
  }

  return {
    parsed: {
      ticker,
      assetType,
      currency,
      shares,
      costBasis,
      currentValue,
    },
    errors,
  };
}

function validateOptionsRow(
  row: Record<string, string>,
  rowNumber: number
): { parsed?: ParsedOptionsRow; errors: string[] } {
  const errors: string[] = [];
  const underlying = getField(row, "Underlying")?.toUpperCase();
  const strategyRaw = getField(row, "Strategy");
  const entryDate = parseDate(getField(row, "Entry Date"));
  const expiryDate = parseDate(getField(row, "Expiry Date"));
  const contracts = parseNumber(getField(row, "Contracts"));
  const strikes = getField(row, "Strikes") ?? "";
  const premium = parseNumber(getField(row, "Premium"));
  const maxRisk = parseNumber(getField(row, "Max Risk"));
  const statusRaw = getField(row, "Status");

  if (!underlying) errors.push("Underlying is required");
  const strategy = strategyRaw ? normalizeStrategy(strategyRaw) : null;
  if (!strategy) errors.push("Valid Strategy required");
  if (!entryDate) errors.push("Valid Entry Date required");
  if (!expiryDate) errors.push("Valid Expiry Date required");
  if (contracts == null || contracts <= 0) errors.push("Contracts must be positive");
  if (premium == null) errors.push("Premium is required");
  if (maxRisk == null || maxRisk <= 0) errors.push("Max Risk must be positive");
  const status = statusRaw ? normalizeStatus(statusRaw) : null;
  if (!status) errors.push("Valid Status required");

  if (
    errors.length ||
    !underlying ||
    !strategy ||
    !entryDate ||
    !expiryDate ||
    contracts == null ||
    premium == null ||
    maxRisk == null ||
    !status
  ) {
    return { errors };
  }

  const strikeParts = parseStrikes(strikes);

  return {
    parsed: {
      underlying,
      strategy,
      entryDate,
      expiryDate,
      contracts,
      strikes,
      premium,
      maxRisk,
      status,
      ...strikeParts,
    },
    errors,
  };
}

function validateCryptoRow(
  row: Record<string, string>
): { parsed?: ParsedCryptoRow; errors: string[] } {
  const errors: string[] = [];
  const ticker = getField(row, "Ticker")?.toUpperCase();
  const invested = parseNumber(getField(row, "Invested Amount SGD"));
  const current = parseNumber(getField(row, "Current Value SGD"));

  if (!ticker) errors.push("Ticker is required");
  if (invested == null || invested < 0) errors.push("Invested Amount SGD required");
  if (current == null || current < 0) errors.push("Current Value SGD required");

  if (errors.length || !ticker || invested == null || current == null) {
    return { errors };
  }

  return {
    parsed: { ticker, investedAmountSgd: invested, currentValueSgd: current },
    errors,
  };
}

function validateWatchlistRow(
  row: Record<string, string>
): { parsed?: ParsedWatchlistRow; errors: string[] } {
  const errors: string[] = [];
  const ticker = getField(row, "Ticker")?.toUpperCase();
  if (!ticker) errors.push("Ticker is required");

  const support1 = parseNumber(getField(row, "Support1"));
  const support2 = parseNumber(getField(row, "Support2"));
  const resistance1 = parseNumber(getField(row, "Resistance1"));
  const resistance2 = parseNumber(getField(row, "Resistance2"));
  const notes = getField(row, "Notes") ?? null;

  if (errors.length || !ticker) return { errors };

  return {
    parsed: {
      ticker,
      support1,
      support2,
      resistance1,
      resistance2,
      notes,
    },
    errors,
  };
}

function duplicateKey(
  entityType: ImportEntityType,
  parsed: unknown
): string {
  switch (entityType) {
    case "portfolio_holdings": {
      const p = parsed as ParsedPortfolioRow;
      return `${p.ticker}|${p.assetType}`;
    }
    case "options_trades": {
      const p = parsed as ParsedOptionsRow;
      return `${p.underlying}|${p.entryDate}|${p.expiryDate}|${p.strategy}`;
    }
    case "crypto": {
      const p = parsed as ParsedCryptoRow;
      return p.ticker;
    }
    case "watchlist": {
      const p = parsed as ParsedWatchlistRow;
      return p.ticker;
    }
  }
}

export function buildImportPreview(
  entityType: ImportEntityType,
  rows: Record<string, string>[],
  existingKeys: Set<string>
): ImportPreviewResult {
  const headers =
    entityType === "portfolio_holdings"
      ? [...PORTFOLIO_HOLDINGS_HEADERS]
      : entityType === "options_trades"
        ? [...OPTIONS_TRADES_HEADERS]
        : entityType === "crypto"
          ? [...CRYPTO_HEADERS]
          : [...WATCHLIST_HEADERS];

  const previewRows = rows.map((row, index) => {
    const rowNumber = index + 2;
    let result: { parsed?: unknown; errors: string[] };

    switch (entityType) {
      case "portfolio_holdings":
        result = validatePortfolioRow(row, rowNumber);
        break;
      case "options_trades":
        result = validateOptionsRow(row, rowNumber);
        break;
      case "crypto":
        result = validateCryptoRow(row);
        break;
      case "watchlist":
        result = validateWatchlistRow(row);
        break;
    }

    const isValid = result.errors.length === 0 && result.parsed != null;
    const isDuplicate =
      isValid && existingKeys.has(duplicateKey(entityType, result.parsed));

    return {
      rowNumber,
      data: row,
      isValid,
      isDuplicate,
      errors: result.errors,
      parsed: result.parsed,
    };
  });

  return {
    entityType,
    headers,
    rows: previewRows,
    validCount: previewRows.filter((r) => r.isValid && !r.isDuplicate).length,
    duplicateCount: previewRows.filter((r) => r.isDuplicate).length,
    errorCount: previewRows.filter((r) => !r.isValid).length,
  };
}

export function getExpectedHeaders(entityType: ImportEntityType): readonly string[] {
  switch (entityType) {
    case "portfolio_holdings":
      return PORTFOLIO_HOLDINGS_HEADERS;
    case "options_trades":
      return OPTIONS_TRADES_HEADERS;
    case "crypto":
      return CRYPTO_HEADERS;
    case "watchlist":
      return WATCHLIST_HEADERS;
  }
}
