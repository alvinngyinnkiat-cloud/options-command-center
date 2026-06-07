import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { DataHealthWidgetLine } from "@/lib/data-health/types";
import { DataHealthStatusBadge } from "@/components/data-health/DataHealthStatusBadge";

interface DataHealthWidgetProps {
  lines: DataHealthWidgetLine[];
}

export function DataHealthWidget({ lines }: DataHealthWidgetProps) {
  return (
    <Card variant="bordered">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Data Health</CardTitle>
          <Link
            href="/data-health"
            className="text-[10px] text-accent hover:underline"
          >
            Full check →
          </Link>
        </div>
        <CardDescription>Auto-update status across data sources</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-xs">
          {lines.map((line, i) => (
            <li key={`${line.label}-${i}`} className="flex items-center justify-between gap-2">
              <span className="text-terminal-muted">{line.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-terminal-text">{line.message}</span>
                <DataHealthStatusBadge status={line.status} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
