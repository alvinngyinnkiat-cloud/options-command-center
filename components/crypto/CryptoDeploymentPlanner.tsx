import type { CryptoDeploymentBucket } from "@/lib/crypto/allocation";
import { formatSGD } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface CryptoDeploymentPlannerProps {
  cryptoCashSgd: number;
  plan: CryptoDeploymentBucket[];
}

export function CryptoDeploymentPlanner({
  cryptoCashSgd,
  plan,
}: CryptoDeploymentPlannerProps) {
  return (
    <Card variant="bordered">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Deployment Planner</CardTitle>
        <CardDescription>
          Uses Available Exchange Cash only — not coin holdings or stablecoins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-terminal-border/60 bg-terminal-elevated/20 px-3 py-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-terminal-muted">
              Available Deployable Cash
            </span>
            <span className="font-mono text-terminal-text">
              {formatSGD(cryptoCashSgd)}
            </span>
          </div>
        </div>

        <ul className="space-y-2">
          {plan.map((bucket) => (
            <li
              key={bucket.label}
              className="flex items-center justify-between gap-2 rounded border border-terminal-border/50 px-3 py-2 text-xs"
            >
              <span className="text-terminal-text">{bucket.label}</span>
              <span className="font-mono text-terminal-muted">
                {bucket.percent}% · {formatSGD(bucket.amountSgd)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
