"use client";

import { Bell, Menu, Search } from "lucide-react";
import { MOCK_MARKET_STATUS } from "@/lib/mock/dashboard";
import { cn, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const spyPositive = MOCK_MARKET_STATUS.spyChange >= 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm px-4">
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden -ml-1"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
        <Badge variant="success">{MOCK_MARKET_STATUS.session}</Badge>
        <span className="text-terminal-muted">{MOCK_MARKET_STATUS.time}</span>
        <span className="text-terminal-border">|</span>
        <span className="text-terminal-muted">
          VIX{" "}
          <span className="text-terminal-text">{MOCK_MARKET_STATUS.vix}</span>
        </span>
        <span className="text-terminal-border">|</span>
        <span className="text-terminal-muted">
          SPY{" "}
          <span
            className={cn(
              spyPositive ? "text-profit" : "text-loss"
            )}
          >
            {formatPercent(MOCK_MARKET_STATUS.spyChange)}
          </span>
        </span>
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2 max-w-xs w-full">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-terminal-muted" />
          <input
            type="search"
            placeholder="Search symbols, trades..."
            className="w-full h-8 rounded-md border border-terminal-border bg-terminal-surface pl-9 pr-3 text-sm text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>
      </div>

      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warning" />
      </Button>

      <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-terminal-border">
        <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-accent">A</span>
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-medium text-terminal-text leading-tight">Alvin</p>
          <p className="text-[10px] text-terminal-muted leading-tight">Trader</p>
        </div>
      </div>
    </header>
  );
}
