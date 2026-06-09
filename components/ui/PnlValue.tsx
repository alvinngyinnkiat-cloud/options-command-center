import {
  formatPnL,
  formatPnLPercent,
  getPnLColor,
  type FormatPnLOptions,
} from "@/lib/format/pnl";
import { cn } from "@/lib/utils";

interface PnlValueProps extends FormatPnLOptions {
  value: number;
  className?: string;
}

export function PnlValue({ value, className, ...options }: PnlValueProps) {
  return (
    <span className={cn("font-mono", getPnLColor(value), className)}>
      {formatPnL(value, options)}
    </span>
  );
}

interface PnlPercentValueProps {
  value: number;
  decimals?: number;
  className?: string;
}

export function PnlPercentValue({
  value,
  decimals = 1,
  className,
}: PnlPercentValueProps) {
  return (
    <span className={cn("font-mono", getPnLColor(value), className)}>
      {formatPnLPercent(value, decimals)}
    </span>
  );
}
