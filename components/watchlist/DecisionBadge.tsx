import { Badge } from "@/components/ui/Badge";
import type { DecisionLabel } from "@/lib/watchlist/scoring/types";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info" | "outline";

function variantForDecision(label: DecisionLabel): BadgeVariant {
  switch (label) {
    case "Trade Immediately":
      return "success";
    case "Strong Candidate":
      return "info";
    case "Watchlist":
      return "warning";
    case "No Trade":
      return "outline";
  }
}

interface DecisionBadgeProps {
  label: DecisionLabel;
}

export function DecisionBadge({ label }: DecisionBadgeProps) {
  return (
    <Badge variant={variantForDecision(label)} className="whitespace-nowrap text-[10px]">
      {label}
    </Badge>
  );
}
