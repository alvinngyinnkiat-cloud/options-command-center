import { formatDisplayDate } from "@/lib/format/datetime";

export {
  formatProgressPercent,
  formatSGD,
  formatSignedSGD,
} from "@/lib/utils";

export function formatGoalDateDisplay(dateStr: string | null): string {
  if (!dateStr) return "—";
  return formatDisplayDate(dateStr);
}

export function formatCagr(value: number): string {
  return `${value.toFixed(2)}%`;
}
