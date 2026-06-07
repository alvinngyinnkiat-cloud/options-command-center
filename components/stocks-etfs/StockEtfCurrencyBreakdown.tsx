import { StatCard } from "@/components/ui/StatCard";
import { formatNativeValue } from "@/lib/portfolio/format-holdings";
import type { StockEtfCurrencyBreakdown } from "@/lib/stocks-etfs/types";
import { formatSGD } from "@/lib/utils";

interface StockEtfCurrencyBreakdownProps {
  breakdown: StockEtfCurrencyBreakdown;
}

export function StockEtfCurrencyBreakdownCards({
  breakdown,
}: StockEtfCurrencyBreakdownProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="SGD Holdings"
        value={formatSGD(breakdown.sgdHoldingsValueSgd)}
        change="Primary display currency"
      />
      <StatCard
        label="USD Holdings"
        value={formatNativeValue(breakdown.usdHoldingsValueNative, "USD")}
        change={`≈ ${formatSGD(breakdown.usdHoldingsValueSgd)} SGD`}
      />
      <StatCard
        label="Total SGD Equivalent"
        value={formatSGD(breakdown.totalSgdEquivalent)}
        change="All holdings converted"
      />
    </div>
  );
}
