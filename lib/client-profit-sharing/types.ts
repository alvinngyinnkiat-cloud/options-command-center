import type { DataSource } from "@/lib/portfolio/types";
import type { ClientAllocationStatus } from "@/types/database";

export interface ClientProfile {
  id: string;
  clientName: string;
  capitalContributed: number;
  clientSharePct: number;
  mySharePct: number;
  totalPaidToClient: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfileFormInput {
  clientName: string;
  capitalContributed: number;
  clientSharePct: number;
  mySharePct: number;
  notes: string | null;
}

export interface TradeAllocationRow {
  allocationId: string | null;
  tradeId: string;
  clientId: string;
  ticker: string;
  strategyLabel: string;
  statusLabel: string;
  entryDate: string;
  exitDate: string | null;
  includedInPool: boolean;
  tradeProfit: number;
  clientSharePct: number;
  mySharePct: number;
  clientProfit: number;
  myProfit: number;
  allocationStatus: ClientAllocationStatus;
  paymentLabel: "Paid" | "Unpaid" | "—";
}

export interface ClientProfitSharingSummary {
  totalClientCapital: number;
  allocatedTradesCount: number;
  totalClientProfit: number;
  totalClientLoss: number;
  totalClientNetPl: number;
  totalMySharePl: number;
  clientSharePaid: number;
  clientShareOwed: number;
  totalPaidToClient: number;
  outstandingAmountOwed: number;
  lifetimeTradeProfit: number;
  lifetimeClientShare: number;
  lifetimeMyShare: number;
}

export interface ClientProfitSharingData {
  clients: ClientProfile[];
  activeClientId: string | null;
  tradeAllocations: TradeAllocationRow[];
  summary: ClientProfitSharingSummary;
  dataSource: DataSource;
}

export type ClientProfitSharingActionResult =
  | { success: true; data: ClientProfitSharingData }
  | { success: false; error: string };
