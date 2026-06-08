"use client";

import { useMemo, useState } from "react";
import {
  buildCapitalLiquidityCheck,
  type CapitalLiquidityBase,
} from "@/lib/risk/capital-liquidity";
import {
  formatLiquidityRatio,
  formatRiskCurrency,
  formatRiskPct,
  riskZoneClass,
  riskZoneLabel,
  stressTestClass,
  stressTestLabel,
} from "@/lib/risk/format";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import { formatSGD } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CapitalLiquidityCheckProps {
  base: CapitalLiquidityBase;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 p-3">
      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  valueClassName,
  sub,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  sub?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
        {label}
      </p>
      <p className={cn("font-mono text-sm", valueClassName)}>{value}</p>
      {sub && <p className="text-[10px] text-terminal-muted">{sub}</p>}
    </div>
  );
}

export function CapitalLiquidityCheck({ base }: CapitalLiquidityCheckProps) {
  const [newTradeRisk, setNewTradeRisk] = useState("2500");

  const result = useMemo(() => {
    const risk = parseFloat(newTradeRisk) || 0;
    return buildCapitalLiquidityCheck(base, risk);
  }, [base, newTradeRisk]);

  const inputClass =
    "w-full max-w-xs rounded border border-terminal-border bg-terminal-elevated px-3 py-2 font-mono text-sm";

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-4 space-y-4">
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Capital & Liquidity Check
        </h2>
        <p className="mt-1 text-[11px] text-terminal-muted">
          Can you open a new trade, close all positions, and survive worst-case
          drawdown? One trade per ticker · actual cash balances · S/R manual only
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase text-terminal-muted">
          New Trade Risk ($)
        </span>
        <input
          type="number"
          step="1"
          min="0"
          className={inputClass}
          value={newTradeRisk}
          onChange={(e) => setNewTradeRisk(e.target.value)}
        />
      </label>

      <Section title="Capital (Trading Only)">
        <Field
          label="My Portfolio Value (SGD)"
          value={formatSGD(result.portfolioValue)}
          sub="Trading + crypto — display only"
        />
        <Field
          label="Trading Capital (SGD)"
          value={formatSGD(result.tradingCapital)}
          sub="Used for options risk (× 75%)"
        />
        <Field
          label="US Stocks & Options (USD)"
          value={formatNativeValue(result.usStocksOptionsValueUsd, "USD")}
          sub="US trading capacity reference"
        />
        <Field
          label="Crypto Value (SGD)"
          value={formatSGD(result.cryptoValue)}
        />
      </Section>

      <Section title="Trading Cash">
        <Field label="SGD Cash (Broker)" value={formatSGD(result.cash.cashSgd)} />
        <Field
          label="USD Cash (Broker)"
          value={formatNativeValue(result.cash.cashUsdNative, "USD")}
          sub="US stocks · options · buying power (reference)"
        />
        <Field
          label="Trading Cash Available"
          value={formatSGD(result.cash.tradingCashSgd)}
          sub="Excludes crypto cash"
        />
        {result.cash.cryptoCashSgd > 0 && (
          <Field
            label="Crypto Cash (not for trading)"
            value={formatSGD(result.cash.cryptoCashSgd)}
          />
        )}
      </Section>

      <Section title="Trading">
        <Field
          label="US Stocks & Options Value (USD)"
          value={formatNativeValue(result.usStocksOptionsValueUsd, "USD")}
        />
        <Field
          label="Current Open Risk"
          value={formatRiskCurrency(result.currentOpenRisk)}
        />
        <Field
          label="Remaining USD Buying Power"
          value={formatNativeValue(result.usdTradingBuyingPower, "USD")}
          valueClassName={
            result.usdTradingBuyingPower >= 0 ? "text-profit" : "text-loss"
          }
          sub="USD Cash − Current Open Risk"
        />
      </Section>

      <Section title="Risk">
        <Field
          label="Current Open Risk"
          value={formatRiskCurrency(result.currentOpenRisk)}
        />
        <Field
          label="Available Risk Capacity"
          value={formatRiskCurrency(result.availableRiskCapacity)}
        />
        <Field
          label="New Trade Risk"
          value={formatRiskCurrency(result.newTradeRisk)}
        />
        <Field
          label="Position Market Value"
          value={formatRiskCurrency(result.currentPositionMarketValue)}
        />
        <Field
          label="Open Trades Count"
          value={String(result.openTradesCount)}
        />
        <Field
          label="Max Options Capital (75%)"
          value={formatRiskCurrency(result.maximumOptionsCapital)}
        />
      </Section>

      <Section title="Liquidity">
        <Field
          label="Close Requirement"
          value={formatRiskCurrency(result.currentPositionCloseRequirement)}
        />
        <Field
          label="Liquidity Ratio"
          value={formatLiquidityRatio(result.liquidityRatio)}
          valueClassName={
            result.liquidityRatio > 2
              ? "text-profit"
              : result.liquidityRatio >= 1
                ? "text-warning"
                : "text-loss"
          }
        />
        <Field
          label="Emergency Buffer"
          value={formatRiskCurrency(result.emergencyBuffer)}
          valueClassName={
            result.emergencyBuffer >= 0 ? "text-profit" : "text-loss"
          }
        />
        <Field
          label="After New Trade Buffer"
          value={formatRiskCurrency(result.afterNewTradeBuffer)}
          valueClassName={
            result.afterNewTradeBuffer >= 0 ? "text-terminal-text" : "text-loss"
          }
        />
        <Field
          label="Stock Deployable Capital (USD)"
          value={formatNativeValue(result.stockDeployableCapital, "USD")}
        />
        <Field
          label="Remaining After New Trade"
          value={formatRiskCurrency(result.remainingCapitalAfterNewTrade)}
          valueClassName={
            result.remainingCapitalAfterNewTrade >= 0
              ? "text-profit"
              : "text-loss"
          }
        />
        <Field
          label="Capital Utilization"
          value={formatRiskPct(result.capitalUtilizationPct)}
          valueClassName={
            result.capitalUtilizationPct > 75
              ? "text-loss"
              : result.capitalUtilizationPct >= 60
                ? "text-warning"
                : "text-profit"
          }
        />
      </Section>

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/30 p-4">
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Decision
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Trade Eligibility"
            value={result.tradeEligible ? "YES" : "NO"}
            valueClassName={cn(
              "text-lg font-bold",
              result.tradeEligible ? "text-profit" : "text-loss"
            )}
          />
          <Field
            label="Can Close All Positions"
            value={result.canCloseAllPositions ? "YES" : "NO"}
            valueClassName={cn(
              "text-lg font-bold",
              result.canCloseAllPositions ? "text-profit" : "text-loss"
            )}
          />
          <Field
            label="Final Status"
            value={riskZoneLabel(result.finalStatus)}
            valueClassName={cn(
              "text-lg font-bold uppercase",
              riskZoneClass(result.finalStatus)
            )}
          />
        </div>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-elevated/20 p-4">
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-terminal-muted">
          Stress Test
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field
            label="Cash Available"
            value={formatSGD(result.stressTest.cashAvailable)}
          />
          <Field
            label="Current Close Requirement"
            value={formatRiskCurrency(result.stressTest.currentCloseRequirement)}
          />
          <Field
            label="Worst Case Open Risk"
            value={formatRiskCurrency(result.stressTest.worstCaseOpenRisk)}
          />
          <Field
            label="Remaining After Worst Case"
            value={formatRiskCurrency(
              result.stressTest.remainingCashAfterWorstCase
            )}
            valueClassName={
              result.stressTest.remainingCashAfterWorstCase >= 0
                ? "text-profit"
                : "text-loss"
            }
          />
          <Field
            label="Result"
            value={stressTestLabel(result.stressTest.status)}
            valueClassName={stressTestClass(result.stressTest.status)}
          />
        </div>
      </div>
    </div>
  );
}
