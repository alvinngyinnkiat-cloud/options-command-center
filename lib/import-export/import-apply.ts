import {
  holdingRecordFromCsv,
  upsertMockPortfolioHolding,
} from "@/lib/mock/portfolio-holdings-store";
import { upsertMockCryptoHolding } from "@/lib/mock/crypto-store";
import { upsertMockTrade } from "@/lib/mock/trades-store";
import { upsertWatchlistImportEntry } from "@/lib/mock/watchlist-store";
import { buildTradeCalculations } from "@/lib/trades/calculations";
import { persistOptionsTrade } from "@/lib/supabase/queries/options-trades";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type {
  CryptoHolding,
  CryptoHoldingInsert,
  HoldingInsert,
  OptionsTrade,
  SupportResistanceInsert,
} from "@/types/database";
import type {
  ImportEntityType,
  ImportPreviewRow,
  ImportSummary,
} from "./types";
import type {
  ParsedCryptoRow,
  ParsedOptionsRow,
  ParsedPortfolioRow,
  ParsedWatchlistRow,
} from "./validate";

async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return "mock-user";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "mock-user";
}

function buildTradeFromParsed(
  parsed: ParsedOptionsRow,
  userId: string
): OptionsTrade {
  const calc = buildTradeCalculations({
    strategy: parsed.strategy,
    expirationDate: parsed.expiryDate,
    contracts: parsed.contracts,
    premiumPerContract: parsed.premium,
    currentOptionValuePerContract: 0,
    exitDebit: null,
    status: parsed.status,
    takeProfitTargetPct: 75,
    stopLossTargetPct: 175,
    sellCallCoverage: "covered",
    strikes: {
      shortStrikePut: parsed.shortStrikePut,
      longStrikePut: parsed.longStrikePut,
      shortStrikeCall: parsed.shortStrikeCall,
      longStrikeCall: parsed.longStrikeCall,
    },
  });

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    watchlist_id: `import-${parsed.underlying}`,
    ticker: parsed.underlying,
    strategy: parsed.strategy,
    status: parsed.status,
    entry_date: parsed.entryDate,
    expiration_date: parsed.expiryDate,
    dte: calc.dte,
    contracts: parsed.contracts,
    credit_received: parsed.premium,
    max_risk: parsed.maxRisk,
    current_pnl: 0,
    pnl_percent: 0,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: parsed.shortStrikePut,
    long_strike_put: parsed.longStrikePut,
    short_strike_call: parsed.shortStrikeCall,
    long_strike_call: parsed.longStrikeCall,
    width: calc.width,
    current_value: 0,
    manual_current_option_value: null,
    system_current_option_value: 0,
    current_value_source: "system",
    current_value_updated_at: null,
    exit_debit: null,
    realized_pnl: null,
    fees_commission: 0,
    broker_realized_pnl: null,
    buying_power_used: calc.buyingPowerUsed,
    breakeven_put: calc.breakevenPut,
    breakeven_call: calc.breakevenCall,
    take_profit_price: calc.takeProfitPrice,
    stop_loss_price: calc.stopLossPrice,
    trade_score: null,
    recommended_strategy: null,
    confidence_level: null,
    reason_for_entry: "Imported via CSV",
    notes: null,
    trade_ownership: "personal",
    client_id: null,
    my_profit_share_percent: 60,
    client_profit_share_percent: 40,
    is_client_trade: false,
    sell_call_coverage:
      parsed.strategy === "sell_call" ? "covered" : null,
    shares_owned: null,
    parent_trade_id: null,
    original_cost: null,
    created_at: now,
    updated_at: now,
  };
}

async function applyPortfolioRow(parsed: ParsedPortfolioRow): Promise<void> {
  const record = holdingRecordFromCsv({
    ticker: parsed.ticker,
    assetType: parsed.assetType,
    currency: parsed.currency,
    shares: parsed.shares,
    costBasis: parsed.costBasis,
    currentValue: parsed.currentValue,
  });
  upsertMockPortfolioHolding(record);

  if (isSupabaseConfigured()) {
    const userId = await resolveUserId();
    const supabase = await createClient();
    const row: HoldingInsert = {
      id: crypto.randomUUID(),
      user_id: userId,
      snapshot_id: null,
      ticker: record.ticker,
      asset_type: record.asset_type,
      quantity: record.quantity,
      market_value: record.market_value_sgd,
      currency: record.currency,
      market_value_native: record.market_value_native,
      fx_rate_to_sgd: record.fx_rate_to_sgd,
      market_value_sgd: record.market_value_sgd,
      cost_basis: record.cost_basis,
      strategy: null,
      linked_trade_id: null,
      notes: null,
    };
    // Holdings upsert typed as never in generated client — runtime path is valid
    await supabase.from("holdings").upsert([row] as never);
  }
}

async function applyOptionsRow(parsed: ParsedOptionsRow): Promise<void> {
  const userId = await resolveUserId();
  const trade = buildTradeFromParsed(parsed, userId);
  upsertMockTrade(trade);
  await persistOptionsTrade(trade, userId);
}

async function applyCryptoRow(parsed: ParsedCryptoRow): Promise<void> {
  const userId = await resolveUserId();
  const now = new Date().toISOString();
  const row: CryptoHolding = {
    id: crypto.randomUUID(),
    user_id: userId,
    asset_label: parsed.ticker,
    ticker: parsed.ticker,
    total_invested_sgd: parsed.investedAmountSgd,
    current_value_sgd: parsed.currentValueSgd,
    notes: "Imported via CSV",
    last_updated: now.split("T")[0],
    created_at: now,
    updated_at: now,
  };
  upsertMockCryptoHolding(row);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const insertRow: CryptoHoldingInsert = row;
    await supabase.from("crypto_holdings").upsert([insertRow] as never);
  }
}

async function applyWatchlistRow(parsed: ParsedWatchlistRow): Promise<void> {
  upsertWatchlistImportEntry({
    ticker: parsed.ticker,
    support1: parsed.support1,
    support2: parsed.support2,
    resistance1: parsed.resistance1,
    resistance2: parsed.resistance2,
    notes: parsed.notes,
  });

  if (isSupabaseConfigured()) {
    const userId = await resolveUserId();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("ticker", parsed.ticker)
      .maybeSingle();

    let watchlistId = (existing as { id: string } | null)?.id;
    if (!watchlistId) {
      const { data: created } = await supabase
        .from("watchlist")
        .insert({
          user_id: userId,
          ticker: parsed.ticker,
          is_active: true,
          sort_order: 999,
        } as never)
        .select("id")
        .single();
      watchlistId = (created as { id: string } | null)?.id;
    }

    if (watchlistId) {
      const srRow: SupportResistanceInsert = {
        user_id: userId,
        watchlist_id: watchlistId,
        ticker: parsed.ticker,
        support_1: parsed.support1,
        support_2: parsed.support2,
        resistance_1: parsed.resistance1,
        resistance_2: parsed.resistance2,
        notes: parsed.notes,
        timeframe: "daily",
        update_date: new Date().toISOString().split("T")[0],
      };
      await supabase.from("support_resistance").upsert([srRow] as never);
    }
  }
}

export async function applyImportRows(
  entityType: ImportEntityType,
  rows: ImportPreviewRow[],
  skipDuplicates: boolean
): Promise<ImportSummary> {
  let imported = 0;
  let skipped = 0;
  const errors: ImportSummary["errors"] = [];

  for (const row of rows) {
    if (!row.isValid) {
      skipped++;
      for (const message of row.errors) {
        errors.push({ row: row.rowNumber, message });
      }
      continue;
    }
    if (row.isDuplicate && skipDuplicates) {
      skipped++;
      continue;
    }

    try {
      switch (entityType) {
        case "portfolio_holdings":
          await applyPortfolioRow(row.parsed as ParsedPortfolioRow);
          break;
        case "options_trades":
          await applyOptionsRow(row.parsed as ParsedOptionsRow);
          break;
        case "crypto":
          await applyCryptoRow(row.parsed as ParsedCryptoRow);
          break;
        case "watchlist":
          await applyWatchlistRow(row.parsed as ParsedWatchlistRow);
          break;
      }
      imported++;
    } catch (e) {
      skipped++;
      errors.push({
        row: row.rowNumber,
        message: e instanceof Error ? e.message : "Import failed",
      });
    }
  }

  return { entityType, imported, skipped, errors };
}
