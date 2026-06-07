import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Bitcoin,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Handshake,
  Layers,
  LineChart,
  ListOrdered,
  Activity,
  Radar,
  ScanSearch,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Portfolio",
    items: [
      {
        label: "Portfolio Dashboard",
        href: "/",
        icon: Briefcase,
        description: "Account overview and positions",
      },
      {
        label: "Financial Goals",
        href: "/goals",
        icon: Target,
        description: "Income and allocation targets",
      },
    ],
  },
  {
    label: "Market Discovery",
    items: [
      {
        label: "Watchlist Scanner",
        href: "/watchlist",
        icon: Radar,
        description: "Manual options watchlist & scanner",
      },
      {
        label: "Auto Watchlist",
        href: "/auto-watchlist",
        icon: ScanSearch,
        description: "Market cap & performance screener",
      },
      {
        label: "Market Intelligence Center",
        href: "/market-intelligence",
        icon: Brain,
        description: "Newsletters, research & sentiment",
      },
      {
        label: "Weekend Market Review",
        href: "/weekend-review",
        icon: TrendingUp,
        description: "Weekly review workflow & opportunities",
      },
    ],
  },
  {
    label: "Trading",
    items: [
      {
        label: "Risk Dashboard",
        href: "/risk",
        icon: Shield,
        description: "Capital, liquidity & exposure",
      },
      {
        label: "Trade Queue",
        href: "/trade-queue",
        icon: ListOrdered,
        description: "Top-ranked trade opportunities",
      },
      {
        label: "Options Trade Tracker",
        href: "/trades",
        icon: LineChart,
        description: "Active and closed spreads",
      },
      {
        label: "Ticker Position Manager",
        href: "/ticker-positions",
        icon: Layers,
        description: "Combined P/L by ticker",
      },
      {
        label: "Client Profit Sharing Tracker",
        href: "/client-profit-sharing",
        icon: Handshake,
        description: "Client trade profit splits",
      },
      {
        label: "Trading Journal",
        href: "/journal",
        icon: BookOpen,
        description: "Trade notes and lessons",
      },
    ],
  },
  {
    label: "Investments",
    items: [
      {
        label: "Stock & ETF Tracker",
        href: "/stocks",
        icon: Building2,
        description: "Long-term stock and ETF holdings",
      },
      {
        label: "Dividend Tracker",
        href: "/dividends",
        icon: Wallet,
        description: "Dividend calendar, history & manual overrides",
      },
      {
        label: "Crypto Tracker",
        href: "/crypto",
        icon: Bitcoin,
        description: "SGD-invested crypto performance",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        label: "Alerts Center",
        href: "/alerts",
        icon: AlertTriangle,
        description: "Price and trade alerts",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        description: "Performance analytics",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        label: "Import / Export Center",
        href: "/import-export",
        icon: ArrowDownUp,
        description: "CSV, Excel, PDF & backup",
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "System configuration",
      },
      {
        label: "Data Source Health Check",
        href: "/data-health",
        icon: Activity,
        description: "API connectivity and sync status",
      },
    ],
  },
];

/** Flat list for consumers that need a single array (e.g. search, breadcrumbs). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items
);
