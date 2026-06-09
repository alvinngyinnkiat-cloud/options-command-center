"use client";

import { useEffect, useState } from "react";
import { formatSgtHeaderClock } from "@/lib/time/singapore-time";
import { getUsMarketSession } from "@/lib/time/us-market-session";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

function sessionBadgeVariant(
  session: ReturnType<typeof getUsMarketSession>["session"]
): "success" | "warning" | "outline" {
  if (session === "regular") return "success";
  if (session === "pre_market" || session === "after_hours") return "warning";
  return "outline";
}

export function LiveMarketClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted || !now) {
    return (
      <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
        <Badge variant="outline">US Market Closed</Badge>
        <div className="leading-tight">
          <div className="text-terminal-muted">—</div>
          <div className="text-terminal-muted">--:-- PM SGT</div>
          <div className="text-[10px] text-terminal-muted">
            --:-- PM SGT | --:-- AM ET
          </div>
        </div>
      </div>
    );
  }

  const session = getUsMarketSession(now);
  const clock = formatSgtHeaderClock(now);

  return (
    <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
      <Badge variant={sessionBadgeVariant(session.session)}>{session.label}</Badge>
      <div className="leading-tight">
        <div className="text-terminal-text">{clock.dateLine}</div>
        <div className="text-terminal-muted">{clock.timeLine}</div>
        <div className={cn("text-[10px] text-terminal-muted")}>
          {clock.dualTimeLine}
        </div>
      </div>
    </div>
  );
}
