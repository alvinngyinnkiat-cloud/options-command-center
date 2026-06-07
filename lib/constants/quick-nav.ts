import {
  Bitcoin,
  BookOpen,
  Briefcase,
  LineChart,
  Radar,
  ScanSearch,
  Shield,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface QuickNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  metric?: string;
}

export const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    label: "Watchlist Scanner",
    href: "/watchlist",
    icon: Radar,
    description: "Manual watchlist",
    metric: "24 symbols",
  },
  {
    label: "Auto Watchlist",
    href: "/auto-watchlist",
    icon: ScanSearch,
    description: "Cap & perf screener",
    metric: "4 screens",
  },
  {
    label: "Open Trades",
    href: "/trades",
    icon: LineChart,
    description: "Active spreads",
    metric: "12 open",
  },
  {
    label: "Stocks & ETFs",
    href: "/stocks",
    icon: Briefcase,
    description: "Long-term equities",
    metric: "6 holdings",
  },
  {
    label: "Crypto Tracker",
    href: "/crypto",
    icon: Bitcoin,
    description: "SGD crypto P/L",
    metric: "3 assets",
  },
  {
    label: "Trade Journal",
    href: "/journal",
    icon: BookOpen,
    description: "Notes & lessons",
    metric: "8 entries",
  },
  {
    label: "Risk Dashboard",
    href: "/risk",
    icon: Shield,
    description: "Exposure limits",
    metric: "2.1% avg risk",
  },
  {
    label: "Weekend Review",
    href: "/weekend-review",
    icon: TrendingUp,
    description: "Weekly workflow",
    metric: "Top 5 setups",
  },
];
