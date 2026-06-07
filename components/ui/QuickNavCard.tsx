import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./Card";

interface QuickNavCardProps {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  metric?: string;
  className?: string;
}

export function QuickNavCard({
  label,
  href,
  icon: Icon,
  description,
  metric,
  className,
}: QuickNavCardProps) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <Card
        variant="default"
        className="h-full transition-colors hover:border-accent/40 hover:bg-terminal-elevated/50"
      >
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-terminal-border bg-terminal-elevated">
              <Icon className="h-4 w-4 text-accent" />
            </div>
            <ArrowRight className="h-4 w-4 text-terminal-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-3 text-sm font-semibold text-terminal-text">{label}</p>
          <p className="mt-0.5 text-xs text-terminal-muted">{description}</p>
          {metric && (
            <p className="mt-2 font-mono text-xs text-accent">{metric}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
