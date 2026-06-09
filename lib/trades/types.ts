import type { DataSource } from "@/lib/portfolio/types";
import type { UnderlyingPriceSource } from "@/lib/trades/underlying-price-types";
import type { TradePnlAllocation } from "./pnl-allocation";
import type { BreakevenNearestSide, BreakevenSafetyStatus } from "./breakeven-safety";
import type {
  CurrentValueSource,
  SellCallCoverage,
  StrategyType,
  TradeOwnership,
  TradeStatus,
} from "@/types/database";

export type TradeTrackerStatus = TradeStatus | "managed" | "rolled";

export interface TradeMarketContext {
  underlyingAveragePrice?: number | null;
  underlyingCurrentPrice?: number | null;
  underlyingPriceSource?: UnderlyingPriceSource;
  underlyingPriceUpdatedAt?: string | null;
  underlyingPriceUsable?: boolean;
  manualSupport?: number | null;
  manualResistance?: number | null;
  atr14?: number | null;
  journalEntryCount?: number;
  clientName?: string | null;
}

export type SuggestedAction = "Hold" | "Close Position" | "Review Position";

export interface TradeStrikeInput {
  shortStrikePut: number | null;
  longStrikePut: number | null;
  shortStrikeCall: number | null;
  longStrikeCall: number | null;
}

export interface TradeFormInput {
  watchlistId: string;
  ticker: string;
  strategy: StrategyType;
  status: TradeTrackerStatus;
  entryDate: string;
  expirationDate: string;
  contracts: number;
  premiumPerContract: number;
  currentValue: number;
  exitDebit: number | null;
  /** Round-trip fees/commission (USD) for closed trades */
  feesCommission: number;
  /** Manual broker realized P/L override (USD) */
  brokerRealizedPnl: number | null;
  shortStrikePut: number | null;
  longStrikePut: number | null;
  shortStrikeCall: number | null;
  longStrikeCall: number | null;
  takeProfitTargetPct: number;
  stopLossTargetPct: number;
  tradeScore: number | null;
  recommendedStrategy: string | null;
  confidenceLevel: string | null;
  reasonForEntry: string | null;
  notes: string | null;
  /** Average price for underlying — used for alert proximity checks */
  underlyingAveragePrice: number | null;
  /** Manual S/R from watchlist — never auto-generated */
  manualSupport: number | null;
  manualResistance: number | null;
  atr14: number | null;
  /** Manual override for one-trade-per-ticker protection */
  allowDuplicateOverride?: boolean;
  tradeOwnership: TradeOwnership;
  clientId: string | null;
  myProfitSharePercent: number;
  clientProfitSharePercent: number;
  /** Sell Call only — defaults to covered */
  sellCallCoverage: SellCallCoverage;
  /** Sell Call only — shares owned at entry */
  sharesOwned: number | null;
  /** Links covered calls / income trades to a parent LEAPS position */
  parentTradeId: string | null;
  /** LEAPS / debit long — total USD cost basis */
  originalCost: number | null;
}

export interface TradeCalculations {
  width: number;
  totalPremiumReceived: number;
  maxRisk: number;
  buyingPowerUsed: number;
  returnOnRiskPct: number;
  currentPnlPct: number;
  dte: number;
  breakevenPut: number | null;
  breakevenCall: number | null;
  breakevenDisplay: string;
  breakevenPrice: number | null;
  breakevenPutPrice: number | null;
  breakevenCallPrice: number | null;
  breakevenSafetyDistance: number | null;
  breakevenSafetyDistancePct: number | null;
  breakevenPutDistancePct: number | null;
  breakevenCallDistancePct: number | null;
  breakevenNearestSide: BreakevenNearestSide | null;
  breakevenSafetyStatus: BreakevenSafetyStatus | null;
  takeProfitPrice: number;
  takeProfitClosePrice: number;
  takeProfitNetOfFees: number;
  stopLossPrice: number;
  profitTargetAmount: number;
  stopLossAmount: number;
  currentOptionValuePerContract: number;
  currentCloseCost: number;
  currentPnl: number;
  /** Premium − closing debit − fees (before broker override) */
  calculatedRealizedPnl: number | null;
  /** Final closed P/L — broker override or calculated */
  realizedPnl: number | null;
  takeProfitReached: boolean;
  stopLossWarning: boolean;
  /** Sell Put — cash required for assignment */
  cashRequired: number | null;
  /** Sell Call — shares required to cover */
  requiredShares: number | null;
  /** Sell Call naked — unlimited upside risk */
  unlimitedRisk: boolean;
}

export interface UpdateCurrentValueInput {
  currentOptionValue: number | null;
  updatedDate?: string | null;
  notes?: string | null;
}

export interface TradeAlert {
  code: string;
  message: string;
  severity: "warning" | "info";
}

export interface EnrichedTrade {
  id: string;
  watchlistId: string;
  ticker: string;
  strategy: StrategyType;
  strategyLabel: string;
  status: TradeTrackerStatus;
  statusLabel: string;
  entryDate: string;
  expirationDate: string;
  contracts: number;
  premiumPerContract: number;
  /** Total close cost USD — used by risk dashboard */
  currentValue: number;
  currentOptionValue: number | null;
  manualCurrentOptionValue: number | null;
  systemCurrentOptionValue: number;
  currentValueSource: CurrentValueSource;
  currentValueUpdatedAt: string | null;
  valueDifference: number | null;
  /** Total closing cost USD (exit_debit column) */
  exitDebit: number | null;
  /** Per-contract closing debit derived from exitDebit total */
  exitDebitPerContract: number | null;
  feesCommission: number;
  brokerRealizedPnl: number | null;
  strikes: TradeStrikeInput;
  strikesDisplay: string;
  takeProfitTargetPct: number;
  stopLossTargetPct: number;
  tradeScore: number | null;
  recommendedStrategy: string | null;
  confidenceLevel: string | null;
  reasonForEntry: string | null;
  notes: string | null;
  underlyingAveragePrice: number | null;
  /** Display-only — used for breakeven safety distance, not P/L */
  underlyingCurrentPrice: number | null;
  underlyingPriceSource: UnderlyingPriceSource;
  underlyingPriceUpdatedAt: string | null;
  /** When false, breakeven % / status must not use stale or mock prices */
  underlyingPriceUsable: boolean;
  manualSupport: number | null;
  manualResistance: number | null;
  atr14: number | null;
  calculations: TradeCalculations;
  pnlAllocation: TradePnlAllocation;
  alerts: TradeAlert[];
  suggestedAction: SuggestedAction;
  journalEntryCount: number;
  tradeOwnership: TradeOwnership;
  clientId: string | null;
  clientName: string | null;
  myProfitSharePercent: number;
  clientProfitSharePercent: number;
  isClientTrade: boolean;
  sellCallCoverage: SellCallCoverage;
  sharesOwned: number | null;
  parentTradeId: string | null;
  originalCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export type TradeTrackerViewMode = "summary" | "card" | "detailed";

export interface TradeTrackerSummary {
  totalPnl: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  clientPnl: number;
  clientRealizedPnl: number;
  clientUnrealizedPnl: number;
  myPnl: number;
  myRealizedPnl: number;
  myUnrealizedPnl: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalOpenRisk: number;
  totalPremiumCollected: number;
  profitTradesCount: number;
  averageProfit: number;
  losingTradesCount: number;
  averageLoss: number;
  winRate: number;
  /** @deprecated Use totalUnrealizedPnl */
  currentPnl: number;
  /** @deprecated Use totalRealizedPnl */
  realizedPnl: number;
  /** @deprecated Use myUnrealizedPnl */
  myCurrentPnl: number;
  /** @deprecated Use clientUnrealizedPnl */
  clientPnlOwed: number;
  /** @deprecated */
  myOpenRisk: number;
  /** @deprecated */
  clientOpenRisk: number;
}

export interface TradeTrackerData {
  trades: EnrichedTrade[];
  summary: TradeTrackerSummary;
  dataSource: DataSource;
}

export type TradeActionResult =
  | { success: true; data: TradeTrackerData }
  | { success: false; error: string };

export type UpdateCurrentValueResult =
  | { ok: true; trade: EnrichedTrade }
  | { ok: false; error: string };
