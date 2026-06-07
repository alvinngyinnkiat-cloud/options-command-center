import type { DataSource } from "@/lib/portfolio/types";

export type AlertCategory =
  | "scanner"
  | "price"
  | "trade"
  | "risk"
  | "weekend";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertStatus = "active" | "dismissed" | "resolved";

export interface EnrichedAlert {
  id: string;
  key: string;
  alertType: AlertCategory;
  ticker: string | null;
  severity: AlertSeverity;
  message: string;
  suggestedAction: string;
  status: AlertStatus;
  createdDate: string;
}

export interface AlertsCenterSummary {
  total: number;
  active: number;
  critical: number;
  warning: number;
  info: number;
  byType: Record<AlertCategory, number>;
}

export interface AlertsCenterData {
  alerts: EnrichedAlert[];
  summary: AlertsCenterSummary;
  dataSource: DataSource;
}

export type AlertActionResult =
  | { success: true; data: AlertsCenterData }
  | { success: false; error: string };
