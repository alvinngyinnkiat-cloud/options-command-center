/**
 * Supabase database types — Phase 1 schema.
 * See PROJECT_RULES.md for permanent business rules.
 * Regenerate with: npx supabase gen types typescript --local > types/database.ts
 */

export type TimeframeType = "daily" | "weekly";

export type StrategyType =
  | "bull_put_spread"
  | "bear_call_spread"
  | "iron_condor"
  | "sell_put"
  | "sell_call"
  | "leaps"
  | "vertical_call_spread";

export type SellCallCoverage = "covered" | "naked";

export type TradeStatus =
  | "open"
  | "closing"
  | "closed"
  | "managed"
  | "rolled";

export type AssetType = "stock" | "option" | "etf" | "other";

export type GoalType =
  | "income"
  | "allocation"
  | "net_worth"
  | "risk_capacity"
  | "custom";

export type AlertType =
  | "price"
  | "trade"
  | "risk"
  | "expiration"
  | "system";

export type ReportType =
  | "performance"
  | "monthly"
  | "strategy_breakdown"
  | "risk_summary"
  | "custom";

export type ScannerAction = "enter" | "watch" | "avoid" | "hold" | "exit";

export type CurrencyCode = "SGD" | "USD";

export type CurrentValueSource = "manual" | "broker" | "system";

export interface Database {
  public: {
    Tables: {
      portfolio_snapshots: {
        Row: PortfolioSnapshot;
        Insert: PortfolioSnapshotInsert;
        Update: PortfolioSnapshotUpdate;
        Relationships: [
          {
            foreignKeyName: "portfolio_snapshots_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_portfolio_snapshots: {
        Row: DailyPortfolioSnapshot;
        Insert: DailyPortfolioSnapshotInsert;
        Update: DailyPortfolioSnapshotUpdate;
        Relationships: [
          {
            foreignKeyName: "daily_portfolio_snapshots_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      holdings: {
        Row: Holding;
        Insert: HoldingInsert;
        Update: HoldingUpdate;
        Relationships: [
          {
            foreignKeyName: "holdings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holdings_snapshot_id_fkey";
            columns: ["snapshot_id"];
            referencedRelation: "portfolio_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holdings_linked_trade_id_fkey";
            columns: ["linked_trade_id"];
            referencedRelation: "options_trades";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_overrides: {
        Row: PortfolioOverride;
        Insert: PortfolioOverrideInsert;
        Update: PortfolioOverrideUpdate;
        Relationships: [
          {
            foreignKeyName: "portfolio_overrides_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_goals: {
        Row: FinancialGoal;
        Insert: FinancialGoalInsert;
        Update: FinancialGoalUpdate;
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_goal_changes: {
        Row: FinancialGoalChange;
        Insert: FinancialGoalChangeInsert;
        Update: FinancialGoalChangeUpdate;
        Relationships: [
          {
            foreignKeyName: "financial_goal_changes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_goal_changes_goal_id_fkey";
            columns: ["goal_id"];
            referencedRelation: "financial_goals";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_contributions: {
        Row: MonthlyContribution;
        Insert: MonthlyContributionInsert;
        Update: MonthlyContributionUpdate;
        Relationships: [
          {
            foreignKeyName: "monthly_contributions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      watchlist: {
        Row: WatchlistItem;
        Insert: WatchlistItemInsert;
        Update: WatchlistItemUpdate;
        Relationships: [
          {
            foreignKeyName: "watchlist_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      market_data: {
        Row: MarketData;
        Insert: MarketDataInsert;
        Update: MarketDataUpdate;
        Relationships: [
          {
            foreignKeyName: "market_data_watchlist_id_fkey";
            columns: ["watchlist_id"];
            referencedRelation: "watchlist";
            referencedColumns: ["id"];
          },
        ];
      };
      support_resistance: {
        Row: SupportResistance;
        Insert: SupportResistanceInsert;
        Update: SupportResistanceUpdate;
        Relationships: [
          {
            foreignKeyName: "support_resistance_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_resistance_watchlist_id_fkey";
            columns: ["watchlist_id"];
            referencedRelation: "watchlist";
            referencedColumns: ["id"];
          },
        ];
      };
      technical_indicators: {
        Row: TechnicalIndicator;
        Insert: TechnicalIndicatorInsert;
        Update: TechnicalIndicatorUpdate;
        Relationships: [
          {
            foreignKeyName: "technical_indicators_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "technical_indicators_watchlist_id_fkey";
            columns: ["watchlist_id"];
            referencedRelation: "watchlist";
            referencedColumns: ["id"];
          },
        ];
      };
      options_trades: {
        Row: OptionsTrade;
        Insert: OptionsTradeInsert;
        Update: OptionsTradeUpdate;
        Relationships: [
          {
            foreignKeyName: "options_trades_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "options_trades_watchlist_id_fkey";
            columns: ["watchlist_id"];
            referencedRelation: "watchlist";
            referencedColumns: ["id"];
          },
        ];
      };
      crypto_holdings: {
        Row: CryptoHolding;
        Insert: CryptoHoldingInsert;
        Update: CryptoHoldingUpdate;
        Relationships: [
          {
            foreignKeyName: "crypto_holdings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_etf_holdings: {
        Row: StockEtfHolding;
        Insert: StockEtfHoldingInsert;
        Update: StockEtfHoldingUpdate;
        Relationships: [
          {
            foreignKeyName: "stock_etf_holdings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_etf_transactions: {
        Row: StockEtfTransaction;
        Insert: StockEtfTransactionInsert;
        Update: StockEtfTransactionUpdate;
        Relationships: [
          {
            foreignKeyName: "stock_etf_transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_etf_transactions_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "stock_etf_holdings";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_etf_position_adjustments: {
        Row: StockEtfPositionAdjustment;
        Insert: StockEtfPositionAdjustmentInsert;
        Update: StockEtfPositionAdjustmentUpdate;
        Relationships: [
          {
            foreignKeyName: "stock_etf_position_adjustments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_etf_position_adjustments_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "stock_etf_holdings";
            referencedColumns: ["id"];
          },
        ];
      };
      dividend_records: {
        Row: DividendRecordRow;
        Insert: DividendRecordInsert;
        Update: DividendRecordUpdate;
        Relationships: [
          {
            foreignKeyName: "dividend_records_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dividend_records_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "stock_etf_holdings";
            referencedColumns: ["id"];
          },
        ];
      };
      auto_watchlist_results: {
        Row: AutoWatchlistResult;
        Insert: AutoWatchlistResultInsert;
        Update: AutoWatchlistResultUpdate;
        Relationships: [
          {
            foreignKeyName: "auto_watchlist_results_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      data_source_logs: {
        Row: DataSourceLogRow;
        Insert: DataSourceLogInsert;
        Update: DataSourceLogUpdate;
        Relationships: [
          {
            foreignKeyName: "data_source_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      client_profiles: {
        Row: ClientProfileRecord;
        Insert: ClientProfileRecordInsert;
        Update: ClientProfileRecordUpdate;
        Relationships: [
          {
            foreignKeyName: "profit_sharing_clients_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      client_trade_allocations: {
        Row: ClientTradeAllocation;
        Insert: ClientTradeAllocationInsert;
        Update: ClientTradeAllocationUpdate;
        Relationships: [
          {
            foreignKeyName: "profit_sharing_trade_allocations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profit_sharing_trade_allocations_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "client_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trading_journal: {
        Row: TradingJournalEntry;
        Insert: TradingJournalEntryInsert;
        Update: TradingJournalEntryUpdate;
        Relationships: [
          {
            foreignKeyName: "trading_journal_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trading_journal_trade_id_fkey";
            columns: ["trade_id"];
            referencedRelation: "options_trades";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_settings: {
        Row: RiskSettings;
        Insert: RiskSettingsInsert;
        Update: RiskSettingsUpdate;
        Relationships: [
          {
            foreignKeyName: "risk_settings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: Alert;
        Insert: AlertInsert;
        Update: AlertUpdate;
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: Report;
        Insert: ReportInsert;
        Update: ReportUpdate;
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_market_updates: {
        Row: WeeklyMarketUpdate;
        Insert: WeeklyMarketUpdateInsert;
        Update: WeeklyMarketUpdateUpdate;
        Relationships: [
          {
            foreignKeyName: "weekly_market_updates_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_market_updates_watchlist_id_fkey";
            columns: ["watchlist_id"];
            referencedRelation: "watchlist";
            referencedColumns: ["id"];
          },
        ];
      };
      scanner_scores: {
        Row: ScannerScore;
        Insert: ScannerScoreInsert;
        Update: ScannerScoreUpdate;
        Relationships: [
          {
            foreignKeyName: "scanner_scores_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scanner_scores_watchlist_id_fkey";
            columns: ["watchlist_id"];
            referencedRelation: "watchlist";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      timeframe_type: TimeframeType;
      strategy_type: StrategyType;
      trade_status: TradeStatus;
      asset_type: AssetType;
      goal_type: GoalType;
      alert_type: AlertType;
      report_type: ReportType;
      scanner_action: ScannerAction;
    };
    CompositeTypes: Record<string, never>;
  };
}

// --- Row types ---

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  portfolio_value: number;
  available_risk_capacity: number;
  options_allocation_pct: number;
  mtd_pnl: number;
  mtd_pnl_pct: number;
  open_positions_count: number;
  health_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  portfolio_value_sgd: number;
  stock_options_value_sgd: number;
  crypto_value_sgd: number;
  usd_cash: number;
  sgd_cash: number;
  usd_cash_sgd_equivalent: number;
  crypto_cash_sgd: number;
  us_etf_value_sgd: number;
  us_stock_value_sgd: number;
  sg_stock_value_sgd: number;
  current_options_value_sgd: number;
  trading_cash_sgd: number;
  trading_capital_sgd: number;
  open_risk: number;
  available_risk_capacity: number;
  personal_unrealized_pnl: number;
  personal_realized_pnl: number;
  client_pnl: number;
  client_initial_capital_sgd: number;
  client_current_value_sgd: number;
  total_assets_managed_sgd: number;
  portfolio_health_score: number | null;
  notes: string | null;
  is_manual_entry: boolean;
  entered_by: SnapshotEntrySource;
  created_at: string;
  updated_at: string;
}

export type SnapshotEntrySource = "user" | "system";

export interface DataSourceLogRow {
  id: string;
  user_id: string;
  source_name: string;
  status: string;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  snapshot_id: string | null;
  ticker: string;
  asset_type: AssetType;
  quantity: number;
  market_value: number;
  currency: CurrencyCode;
  market_value_native: number;
  fx_rate_to_sgd: number;
  market_value_sgd: number;
  cost_basis: number | null;
  strategy: StrategyType | null;
  linked_trade_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioOverride {
  id: string;
  user_id: string;
  use_manual_override: boolean;
  manual_usd_sgd_rate: number;
  manual_total_portfolio_value_sgd: number | null;
  manual_stocks_value_sgd: number | null;
  manual_etfs_value_sgd: number | null;
  manual_crypto_value_sgd: number | null;
  manual_cash_value_sgd: number | null;
  manual_us_stocks_options_value_usd: number | null;
  manual_us_stocks_options_sgd_equivalent: number | null;
  manual_sg_stocks_cash_value_sgd: number | null;
  manual_sg_stocks_value_sgd: number | null;
  manual_sg_cash_value_sgd: number | null;
  manual_trading_cash_usd: number | null;
  manual_trading_cash_sgd: number | null;
  manual_crypto_cash_sgd: number;
  manual_crypto_holdings_sgd: number | null;
  manual_crypto_contributions_sgd: number | null;
  manual_client_portfolio_sgd: number;
  override_reason: string | null;
  override_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyContribution {
  id: string;
  user_id: string;
  contribution_month: number;
  contribution_year: number;
  stock_options_amount_sgd: number;
  crypto_amount_sgd: number;
  total_amount_sgd: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  start_date: string | null;
  is_active: boolean;
  is_archived: boolean;
  assumed_yield_pct: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoalChange {
  id: string;
  user_id: string;
  goal_id: string;
  goal_name: string;
  field_name: string;
  previous_value: string | null;
  new_value: string | null;
  change_reason: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  display_name: string | null;
  is_active: boolean;
  sort_order: number;
  priority_rank: number;
  watchlist_category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketData {
  id: string;
  watchlist_id: string;
  ticker: string;
  price_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  vix: number | null;
  iv_rank: number | null;
  source: string;
  average_price: number | null;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

/** MANUAL INPUT ONLY — see PROJECT_RULES.md */
export interface SupportResistance {
  id: string;
  user_id: string;
  watchlist_id: string;
  ticker: string;
  timeframe: TimeframeType;
  support_1: number | null;
  support_2: number | null;
  resistance_1: number | null;
  resistance_2: number | null;
  notes: string | null;
  update_date: string;
  created_at: string;
  updated_at: string;
}

/** Auto-refreshed scanner indicators — never writes support/resistance */
export interface TechnicalIndicator {
  id: string;
  user_id: string;
  watchlist_id: string;
  ticker: string;
  indicator_date: string;
  atr_14: number | null;
  ema_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  stochastic: number | null;
  source: string;
  refreshed_at: string;
  created_at: string;
  updated_at: string;
}

export type TradeOwnership = "personal" | "client_profit_sharing";
export type ClientAllocationStatus = "Open" | "Closed" | "Paid" | "Unpaid";

export interface OptionsTrade {
  id: string;
  user_id: string;
  watchlist_id: string;
  ticker: string;
  strategy: StrategyType;
  status: TradeStatus;
  entry_date: string;
  expiration_date: string;
  dte: number;
  contracts: number;
  credit_received: number;
  max_risk: number;
  current_pnl: number;
  pnl_percent: number;
  take_profit_target: number;
  stop_loss_target: number;
  short_strike_put: number | null;
  long_strike_put: number | null;
  short_strike_call: number | null;
  long_strike_call: number | null;
  notes: string | null;
  width: number | null;
  current_value: number;
  manual_current_option_value: number | null;
  system_current_option_value: number | null;
  current_value_source: CurrentValueSource;
  current_value_updated_at: string | null;
  exit_debit: number | null;
  realized_pnl: number | null;
  fees_commission: number;
  broker_realized_pnl: number | null;
  buying_power_used: number | null;
  breakeven_put: number | null;
  breakeven_call: number | null;
  take_profit_price: number | null;
  stop_loss_price: number | null;
  trade_score: number | null;
  recommended_strategy: string | null;
  confidence_level: string | null;
  reason_for_entry: string | null;
  trade_ownership: TradeOwnership;
  client_id: string | null;
  my_profit_share_percent: number;
  client_profit_share_percent: number;
  is_client_trade: boolean;
  sell_call_coverage: SellCallCoverage | null;
  shares_owned: number | null;
  parent_trade_id: string | null;
  original_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface CryptoHolding {
  id: string;
  user_id: string;
  asset_label: string;
  ticker: string;
  total_invested_sgd: number;
  current_value_sgd: number;
  notes: string | null;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export type CryptoTransactionType =
  | "deposit"
  | "monthly_contribution"
  | "buy"
  | "sell"
  | "fee"
  | "manual_adjustment"
  | "manual_cash_update";

export interface CryptoTransaction {
  id: string;
  user_id: string;
  holding_id: string | null;
  transaction_type: CryptoTransactionType;
  transaction_date: string;
  ticker: string | null;
  coin_name: string | null;
  amount_sgd: number;
  fee_sgd: number;
  net_amount_sgd: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClientProfileRecord {
  id: string;
  user_id: string;
  client_name: string;
  capital_contributed: number;
  client_share_percent: number;
  my_share_percent: number;
  total_paid_to_client: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientTradeAllocation {
  id: string;
  user_id: string;
  client_id: string;
  options_trade_id: string;
  included_in_pool: boolean;
  trade_profit_loss: number;
  my_share_amount: number;
  client_share_amount: number;
  status: ClientAllocationStatus;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use ClientProfileRecord */
export type ProfitSharingClient = ClientProfileRecord;
/** @deprecated Use ClientTradeAllocation */
export type ProfitSharingTradeAllocation = ClientTradeAllocation;

export interface AutoWatchlistResult {
  id: string;
  user_id: string;
  category: string;
  rank: number;
  ticker: string;
  company_name: string;
  market_cap: number;
  sector: string;
  current_price: number;
  one_year_performance_percent: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  distance_from_high_percent: number;
  distance_from_low_percent: number;
  generated_at: string;
  data_source: string;
  created_at: string;
  updated_at: string;
}

export interface StockEtfHolding {
  id: string;
  user_id: string;
  ticker: string;
  asset_type: string;
  currency: string;
  sector: string;
  total_invested_native: number;
  current_value_native: number;
  fx_rate_to_sgd: number;
  total_invested_sgd: number;
  current_value_sgd: number;
  shares_held: number | null;
  average_cost: number | null;
  last_market_price_native: number | null;
  last_price_date: string | null;
  price_source: string | null;
  manual_value_override: boolean;
  notes: string | null;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export type StockEtfTransactionType = "buy" | "sell";

export interface StockEtfTransaction {
  id: string;
  user_id: string;
  holding_id: string;
  transaction_type: StockEtfTransactionType;
  transaction_date: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  fees: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockEtfPositionAdjustment {
  id: string;
  user_id: string;
  holding_id: string;
  adjustment_date: string;
  previous_shares: number | null;
  new_shares: number | null;
  previous_average_cost: number | null;
  new_average_cost: number | null;
  previous_total_cost: number | null;
  new_total_cost: number | null;
  previous_notes: string | null;
  new_notes: string | null;
  adjustment_reason: string;
  created_at: string;
}

export type StockEtfLedgerTransactionType =
  | "monthly_contribution"
  | "manual_cash_sync"
  | "buy"
  | "sell"
  | "dividend"
  | "manual_adjustment";

export interface StockEtfCashBalance {
  id: string;
  user_id: string;
  market_category: "us_etf" | "us_stock" | "sg_stock";
  cash_native: number;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
}

export interface StockEtfLedgerEntry {
  id: string;
  user_id: string;
  holding_id: string | null;
  market_category: "us_etf" | "us_stock" | "sg_stock";
  transaction_type: StockEtfLedgerTransactionType;
  transaction_date: string;
  ticker: string | null;
  shares: number | null;
  amount_native: number;
  fee_native: number;
  net_amount_native: number;
  currency: CurrencyCode;
  fx_rate_to_sgd: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DividendMarket = "US" | "SG";

export type DividendCategory =
  | "us_etf"
  | "us_stock"
  | "sg_stock"
  | "sg_reit";

export type DividendSource = "api" | "manual" | "broker";

export type DividendStatus = "upcoming" | "received" | "estimated";

export interface DividendRecordRow {
  id: string;
  user_id: string;
  holding_id: string | null;
  ticker: string;
  market: DividendMarket;
  category: DividendCategory;
  ex_dividend_date: string | null;
  record_date: string | null;
  payment_date: string | null;
  dividend_per_share: number;
  shares_held: number;
  gross_dividend: number;
  withholding_tax: number;
  net_dividend: number;
  currency: string;
  sgd_equivalent: number;
  fx_rate_to_sgd: number | null;
  source: DividendSource;
  status: DividendStatus;
  is_manual_override: boolean;
  is_received: boolean;
  notes: string | null;
  api_reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradingJournalEntry {
  id: string;
  user_id: string;
  trade_id: string | null;
  ticker: string;
  entry_date: string;
  title: string;
  content: string;
  lesson_learned: string | null;
  tags: string[];
  mood: string | null;
  outcome: string | null;
  strategy: string | null;
  dte: number | null;
  contracts: number | null;
  short_strike: number | null;
  long_strike: number | null;
  width: number | null;
  credit_received: number | null;
  breakeven: number | null;
  max_risk: number | null;
  buying_power_used: number | null;
  trade_score: number | null;
  confidence_level: string | null;
  reason_for_entry: string | null;
  exit_date: string | null;
  exit_debit: number | null;
  days_held: number | null;
  profit_loss: number | null;
  return_on_risk_pct: number | null;
  win_loss: string | null;
  exit_reason: string | null;
  entry_setup: string | null;
  exit_outcome: string | null;
  what_went_well: string | null;
  what_to_improve: string | null;
  review_notes: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskSettings {
  id: string;
  user_id: string;
  take_profit_percent: number;
  stop_loss_percent: number;
  max_options_allocation_percent: number;
  max_risk_per_trade_percent: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  ticker: string | null;
  alert_type: AlertType;
  title: string;
  message: string;
  threshold_value: number | null;
  is_active: boolean;
  is_read: boolean;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: ReportType;
  title: string;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  data: Record<string, unknown>;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyMarketUpdate {
  id: string;
  user_id: string;
  watchlist_id: string;
  ticker: string;
  week_ending: string;
  support_1: number | null;
  support_2: number | null;
  resistance_1: number | null;
  resistance_2: number | null;
  analyst_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScannerScore {
  id: string;
  user_id: string;
  watchlist_id: string;
  ticker: string;
  score_date: string;
  trend_score: number;
  stochastic_score: number;
  ema_score: number;
  support_resistance_score: number;
  total_score: number;
  recommended_strategy: StrategyType | null;
  action: ScannerAction;
  decision_label: string;
  trend_pass: boolean;
  stochastic_pass: boolean;
  ema_pass: boolean;
  sr_pass: boolean;
  trend_reason: string | null;
  stochastic_reason: string | null;
  ema_reason: string | null;
  sr_reason: string | null;
  primary_reason: string | null;
  pass_fail_explanation: string | null;
  warning_notes: string | null;
  intelligence_score: number | null;
  combined_score: number | null;
  intelligence_sentiment: string | null;
  intelligence_reason: string | null;
  created_at: string;
  updated_at: string;
}

// --- Insert types (omit auto-generated fields) ---

export type PortfolioSnapshotInsert = Omit<
  PortfolioSnapshot,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type DailyPortfolioSnapshotInsert = Omit<
  DailyPortfolioSnapshot,
  | "id"
  | "created_at"
  | "total_assets_managed_sgd"
  | "trading_cash_sgd"
  | "trading_capital_sgd"
> & { id?: string; created_at?: string };

/** Writable daily snapshot fields (excludes DB-generated columns). */
export type DailyPortfolioSnapshotWrite = Omit<
  DailyPortfolioSnapshot,
  "total_assets_managed_sgd" | "trading_cash_sgd" | "trading_capital_sgd"
>;

export type HoldingInsert = Omit<Holding, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PortfolioOverrideInsert = Omit<
  PortfolioOverride,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type FinancialGoalInsert = Omit<
  FinancialGoal,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type FinancialGoalChangeInsert = Omit<
  FinancialGoalChange,
  "id" | "created_at"
> & { id?: string; created_at?: string };

export type MonthlyContributionInsert = Omit<
  MonthlyContribution,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type WatchlistItemInsert = Omit<
  WatchlistItem,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type MarketDataInsert = Omit<
  MarketData,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type SupportResistanceInsert = Omit<
  SupportResistance,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type TechnicalIndicatorInsert = Omit<
  TechnicalIndicator,
  "id" | "created_at" | "updated_at" | "refreshed_at"
> & { id?: string; created_at?: string; updated_at?: string; refreshed_at?: string };

export type OptionsTradeInsert = Omit<
  OptionsTrade,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type CryptoHoldingInsert = Omit<
  CryptoHolding,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type CryptoTransactionInsert = Omit<
  CryptoTransaction,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type StockEtfHoldingInsert = Omit<
  StockEtfHolding,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type StockEtfTransactionInsert = Omit<
  StockEtfTransaction,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type StockEtfPositionAdjustmentInsert = Omit<
  StockEtfPositionAdjustment,
  "id" | "created_at"
> & { id?: string; created_at?: string };

export type StockEtfCashBalanceInsert = Omit<
  StockEtfCashBalance,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type StockEtfLedgerEntryInsert = Omit<
  StockEtfLedgerEntry,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type AutoWatchlistResultInsert = Omit<
  AutoWatchlistResult,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type ClientProfileRecordInsert = Omit<
  ClientProfileRecord,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type ClientTradeAllocationInsert = Omit<
  ClientTradeAllocation,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

/** @deprecated Use ClientProfileRecordInsert */
export type ProfitSharingClientInsert = ClientProfileRecordInsert;
/** @deprecated Use ClientTradeAllocationInsert */
export type ProfitSharingTradeAllocationInsert = ClientTradeAllocationInsert;

export type TradingJournalEntryInsert = Omit<
  TradingJournalEntry,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type RiskSettingsInsert = Omit<
  RiskSettings,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type AlertInsert = Omit<Alert, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ReportInsert = Omit<Report, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type WeeklyMarketUpdateInsert = Omit<
  WeeklyMarketUpdate,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type ScannerScoreInsert = Omit<
  ScannerScore,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

// --- Update types ---

export type PortfolioSnapshotUpdate = Partial<PortfolioSnapshotInsert>;
export type DailyPortfolioSnapshotUpdate = Partial<DailyPortfolioSnapshotInsert>;
export type HoldingUpdate = Partial<HoldingInsert>;
export type PortfolioOverrideUpdate = Partial<PortfolioOverrideInsert>;
export type FinancialGoalUpdate = Partial<FinancialGoalInsert>;

export type FinancialGoalChangeUpdate = Partial<FinancialGoalChangeInsert>;
export type MonthlyContributionUpdate = Partial<MonthlyContributionInsert>;
export type WatchlistItemUpdate = Partial<WatchlistItemInsert>;
export type MarketDataUpdate = Partial<MarketDataInsert>;
export type SupportResistanceUpdate = Partial<SupportResistanceInsert>;
export type TechnicalIndicatorUpdate = Partial<TechnicalIndicatorInsert>;
export type OptionsTradeUpdate = Partial<OptionsTradeInsert>;
export type CryptoHoldingUpdate = Partial<CryptoHoldingInsert>;
export type CryptoTransactionUpdate = Partial<CryptoTransactionInsert>;
export type StockEtfHoldingUpdate = Partial<StockEtfHoldingInsert>;
export type StockEtfTransactionUpdate = Partial<StockEtfTransactionInsert>;
export type StockEtfPositionAdjustmentUpdate =
  Partial<StockEtfPositionAdjustmentInsert>;

export type DividendRecordInsert = Omit<
  DividendRecordRow,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };

export type DividendRecordUpdate = Partial<DividendRecordInsert>;

export type DataSourceLogInsert = Omit<
  DataSourceLogRow,
  "id" | "created_at"
> & { id?: string; created_at?: string };

export type DataSourceLogUpdate = Partial<DataSourceLogInsert>;

export type AutoWatchlistResultUpdate = Partial<AutoWatchlistResultInsert>;
export type ClientProfileRecordUpdate = Partial<ClientProfileRecordInsert>;
export type ClientTradeAllocationUpdate = Partial<ClientTradeAllocationInsert>;
/** @deprecated Use ClientProfileRecordUpdate */
export type ProfitSharingClientUpdate = ClientProfileRecordUpdate;
/** @deprecated Use ClientTradeAllocationUpdate */
export type ProfitSharingTradeAllocationUpdate = ClientTradeAllocationUpdate;
export type TradingJournalEntryUpdate = Partial<TradingJournalEntryInsert>;
export type RiskSettingsUpdate = Partial<RiskSettingsInsert>;
export type AlertUpdate = Partial<AlertInsert>;
export type ReportUpdate = Partial<ReportInsert>;
export type WeeklyMarketUpdateUpdate = Partial<WeeklyMarketUpdateInsert>;
export type ScannerScoreUpdate = Partial<ScannerScoreInsert>;

// --- Convenience table name union ---

export type TableName = keyof Database["public"]["Tables"];
