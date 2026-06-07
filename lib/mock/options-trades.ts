import { MOCK_REFERENCE_ISO } from "@/lib/mock/reference-dates";
import type { OptionsTrade } from "@/types/database";

const MOCK_USER = "mock-user";
const WL = (ticker: string) => `mock-${ticker}`;

type TradeSeed = Omit<
  OptionsTrade,
  | "user_id"
  | "created_at"
  | "updated_at"
  | "trade_ownership"
  | "client_id"
  | "my_profit_share_percent"
  | "client_profit_share_percent"
  | "is_client_trade"
  | "manual_current_option_value"
  | "system_current_option_value"
  | "current_value_source"
  | "current_value_updated_at"
  | "sell_call_coverage"
  | "shares_owned"
  | "parent_trade_id"
  | "original_cost"
> & {
  id: string;
  trade_ownership?: OptionsTrade["trade_ownership"];
  client_id?: string | null;
  my_profit_share_percent?: number;
  client_profit_share_percent?: number;
  is_client_trade?: boolean;
  sell_call_coverage?: OptionsTrade["sell_call_coverage"];
  shares_owned?: number | null;
  parent_trade_id?: string | null;
  original_cost?: number | null;
};

function trade(partial: TradeSeed): OptionsTrade {
  const now = MOCK_REFERENCE_ISO;
  const currentValue = partial.current_value ?? 0;
  const contracts = partial.contracts;
  const systemPerContract =
    contracts > 0 ? currentValue / (100 * contracts) : 0;

  return {
    ...partial,
    user_id: MOCK_USER,
    created_at: now,
    updated_at: now,
    current_value: currentValue,
    manual_current_option_value: null,
    system_current_option_value: systemPerContract,
    current_value_source: "system",
    current_value_updated_at: null,
    trade_ownership: partial.trade_ownership ?? "personal",
    client_id: partial.client_id ?? null,
    my_profit_share_percent: partial.my_profit_share_percent ?? 60,
    client_profit_share_percent: partial.client_profit_share_percent ?? 40,
    is_client_trade: partial.is_client_trade ?? false,
    sell_call_coverage: partial.sell_call_coverage ?? null,
    shares_owned: partial.shares_owned ?? null,
    parent_trade_id: partial.parent_trade_id ?? null,
    original_cost: partial.original_cost ?? null,
  };
}

export const MOCK_OPTIONS_TRADES: OptionsTrade[] = [
  trade({
    id: "trade-1",
    watchlist_id: WL("SPY"),
    ticker: "SPY",
    strategy: "iron_condor",
    status: "open",
    entry_date: "2026-05-20",
    expiration_date: "2026-06-24",
    dte: 18,
    contracts: 2,
    credit_received: 3.2,
    max_risk: 1360,
    current_pnl: 420,
    pnl_percent: 30.88,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: 505,
    long_strike_put: 500,
    short_strike_call: 535,
    long_strike_call: 540,
    width: 5,
    current_value: 220,
    exit_debit: null,
    realized_pnl: null,
    buying_power_used: 1360,
    breakeven_put: 501.8,
    breakeven_call: 538.2,
    take_profit_price: 480,
    stop_loss_price: 1120,
    trade_score: 88,
    recommended_strategy: "Iron Condor",
    confidence_level: "High",
    reason_for_entry: "Scanner score 88 — neutral range, SO mid-band",
    notes: null,
    trade_ownership: "client_profit_sharing",
    client_id: "client-1",
    is_client_trade: true,
  }),
  trade({
    id: "trade-2",
    watchlist_id: WL("QQQ"),
    ticker: "QQQ",
    strategy: "bull_put_spread",
    status: "open",
    entry_date: "2026-05-28",
    expiration_date: "2026-07-01",
    dte: 25,
    contracts: 1,
    credit_received: 2.85,
    max_risk: 215,
    current_pnl: 185,
    pnl_percent: 86.05,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: 428,
    long_strike_put: 423,
    short_strike_call: null,
    long_strike_call: null,
    width: 5,
    current_value: 100,
    exit_debit: null,
    realized_pnl: null,
    buying_power_used: 215,
    breakeven_put: 425.15,
    breakeven_call: null,
    take_profit_price: 213.75,
    stop_loss_price: 498.75,
    trade_score: 92,
    recommended_strategy: "Bull Put",
    confidence_level: "High",
    reason_for_entry: "Bullish trend + SO oversold on avg price",
    notes: null,
    trade_ownership: "client_profit_sharing",
    client_id: "client-1",
    is_client_trade: true,
  }),
  trade({
    id: "trade-3",
    watchlist_id: WL("IWM"),
    ticker: "IWM",
    strategy: "bear_call_spread",
    status: "managed",
    entry_date: "2026-05-15",
    expiration_date: "2026-06-17",
    dte: 11,
    contracts: 1,
    credit_received: 1.95,
    max_risk: 305,
    current_pnl: -95,
    pnl_percent: -31.15,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: null,
    long_strike_put: null,
    short_strike_call: 205,
    long_strike_call: 210,
    width: 5,
    current_value: 290,
    exit_debit: null,
    realized_pnl: null,
    buying_power_used: 305,
    breakeven_put: null,
    breakeven_call: 206.95,
    take_profit_price: 146.25,
    stop_loss_price: 341.25,
    trade_score: 81,
    recommended_strategy: "Bear Call",
    confidence_level: "Medium",
    reason_for_entry: "Bearish trend filter passed",
    notes: "Adjusted short call — managed",
  }),
  trade({
    id: "trade-4",
    watchlist_id: WL("AAPL"),
    ticker: "AAPL",
    strategy: "bull_put_spread",
    status: "closed",
    entry_date: "2026-04-10",
    expiration_date: "2026-05-16",
    dte: 0,
    contracts: 2,
    credit_received: 2.1,
    max_risk: 580,
    current_pnl: 310,
    pnl_percent: 53.45,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: 198,
    long_strike_put: 193,
    short_strike_call: null,
    long_strike_call: null,
    width: 5,
    current_value: 0,
    exit_debit: 110,
    realized_pnl: 310,
    buying_power_used: 580,
    breakeven_put: 195.9,
    breakeven_call: null,
    take_profit_price: 315,
    stop_loss_price: 735,
    trade_score: 85,
    recommended_strategy: "Bull Put",
    confidence_level: "High",
    reason_for_entry: "Strong candidate at entry",
    notes: "Closed at 75% profit target",
  }),
  trade({
    id: "trade-5",
    watchlist_id: WL("SPY"),
    ticker: "SPY",
    strategy: "bull_put_spread",
    status: "rolled",
    entry_date: "2026-03-01",
    expiration_date: "2026-04-04",
    dte: 0,
    contracts: 1,
    credit_received: 1.5,
    max_risk: 350,
    current_pnl: 50,
    pnl_percent: 14.29,
    take_profit_target: 75,
    stop_loss_target: 175,
    short_strike_put: 510,
    long_strike_put: 505,
    short_strike_call: null,
    long_strike_call: null,
    width: 5,
    current_value: 100,
    exit_debit: 100,
    realized_pnl: 50,
    buying_power_used: 350,
    breakeven_put: 508.5,
    breakeven_call: null,
    take_profit_price: 112.5,
    stop_loss_price: 262.5,
    trade_score: 78,
    recommended_strategy: "Bull Put",
    confidence_level: "Medium",
    reason_for_entry: "Rolled to June expiry",
    notes: "Rolled out in time",
  }),
];
