import {
  HOLDING_CRITICAL_THRESHOLD_PCT,
  HOLDING_WARNING_THRESHOLD_PCT,
  SECTOR_WARNING_THRESHOLD_PCT,
} from "./constants";
import { calculateStockEtfAllocationPct } from "./calculations";
import type {
  ConcentrationEntry,
  ConcentrationWarning,
  EnrichedStockEtfHolding,
  SectorAllocationEntry,
} from "./types";

export function buildTopHoldings(
  holdings: EnrichedStockEtfHolding[],
  limit = 5
): ConcentrationEntry[] {
  const total = holdings.reduce((s, h) => s + h.currentValueSgd, 0);
  return [...holdings]
    .sort((a, b) => b.currentValueSgd - a.currentValueSgd)
    .slice(0, limit)
    .map((h) => ({
      ticker: h.ticker,
      assetType: h.assetType,
      currentValueSgd: h.currentValueSgd,
      allocationPct: calculateStockEtfAllocationPct(h.currentValueSgd, total),
    }));
}

export function buildConcentrationWarnings(
  holdings: EnrichedStockEtfHolding[],
  sectorAllocation: SectorAllocationEntry[]
): ConcentrationWarning[] {
  const warnings: ConcentrationWarning[] = [];
  const total = holdings.reduce((s, h) => s + h.currentValueSgd, 0);

  for (const h of holdings) {
    const pct = calculateStockEtfAllocationPct(h.currentValueSgd, total);
    if (pct > HOLDING_CRITICAL_THRESHOLD_PCT) {
      warnings.push({
        level: "critical",
        type: "holding",
        label: h.ticker,
        allocationPct: pct,
        message: `${h.ticker} exceeds 30% of stock & ETF portfolio (${pct.toFixed(1)}%)`,
      });
    } else if (pct > HOLDING_WARNING_THRESHOLD_PCT) {
      warnings.push({
        level: "warning",
        type: "holding",
        label: h.ticker,
        allocationPct: pct,
        message: `${h.ticker} exceeds 20% of stock & ETF portfolio (${pct.toFixed(1)}%)`,
      });
    }
  }

  for (const sector of sectorAllocation) {
    if (sector.allocationPct > SECTOR_WARNING_THRESHOLD_PCT) {
      warnings.push({
        level: "warning",
        type: "sector",
        label: sector.sector,
        allocationPct: sector.allocationPct,
        message: `${sector.sector} sector exceeds 40% allocation (${sector.allocationPct.toFixed(1)}%)`,
      });
    }
  }

  return warnings.sort((a, b) => b.allocationPct - a.allocationPct);
}
