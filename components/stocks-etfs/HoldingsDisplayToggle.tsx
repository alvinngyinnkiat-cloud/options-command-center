"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Table2 } from "lucide-react";

export type HoldingsDisplayMode = "summary" | "detailed" | "cards";

interface HoldingsDisplayToggleProps {
  mode: HoldingsDisplayMode;
  onChange: (mode: HoldingsDisplayMode) => void;
}

const MODES: {
  id: HoldingsDisplayMode;
  label: string;
  icon: typeof Table2;
}[] = [
  { id: "summary", label: "Summary", icon: Table2 },
  { id: "detailed", label: "Detailed", icon: List },
  { id: "cards", label: "Cards", icon: LayoutGrid },
];

export function HoldingsDisplayToggle({
  mode,
  onChange,
}: HoldingsDisplayToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-terminal-muted">
        View
      </span>
      {MODES.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant={mode === id ? "secondary" : "ghost"}
          size="sm"
          className={cn("h-7 gap-1.5 text-[11px]", mode === id && "font-medium")}
          onClick={() => onChange(id)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
