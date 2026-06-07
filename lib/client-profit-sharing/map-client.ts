import {
  DEFAULT_CLIENT_SHARE_PCT,
  DEFAULT_MY_SHARE_PCT,
} from "./constants";
import type { ClientProfile, ClientProfileFormInput } from "./types";
import type {
  ClientProfileRecord,
  ClientTradeAllocation,
} from "@/types/database";

export function mapClientProfile(row: ClientProfileRecord): ClientProfile {
  return {
    id: row.id,
    clientName: row.client_name,
    capitalContributed: Number(row.capital_contributed),
    clientSharePct: Number(row.client_share_percent),
    mySharePct: Number(row.my_share_percent),
    totalPaidToClient: Number(row.total_paid_to_client),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function clientRowFromForm(
  input: ClientProfileFormInput,
  userId: string,
  existingId?: string,
  existingPaid?: number,
  existingCreatedAt?: string
): ClientProfileRecord {
  const now = new Date().toISOString();
  return {
    id: existingId ?? crypto.randomUUID(),
    user_id: userId,
    client_name: input.clientName.trim(),
    capital_contributed: input.capitalContributed,
    client_share_percent: input.clientSharePct,
    my_share_percent: input.mySharePct,
    total_paid_to_client: existingPaid ?? 0,
    notes: input.notes,
    created_at: existingCreatedAt ?? now,
    updated_at: now,
  };
}

export function defaultClientForm(): ClientProfileFormInput {
  return {
    clientName: "",
    capitalContributed: 0,
    clientSharePct: DEFAULT_CLIENT_SHARE_PCT,
    mySharePct: DEFAULT_MY_SHARE_PCT,
    notes: null,
  };
}

export function formFromClient(client: ClientProfile): ClientProfileFormInput {
  return {
    clientName: client.clientName,
    capitalContributed: client.capitalContributed,
    clientSharePct: client.clientSharePct,
    mySharePct: client.mySharePct,
    notes: client.notes,
  };
}

export interface AllocationMapEntry {
  clientId: string;
  included: boolean;
  allocationId: string;
  tradeProfitLoss: number;
  myShareAmount: number;
  clientShareAmount: number;
  status: ClientTradeAllocation["status"];
}

export function allocationMapFromRows(
  rows: ClientTradeAllocation[]
): Map<string, AllocationMapEntry> {
  const map = new Map<string, AllocationMapEntry>();
  for (const row of rows) {
    map.set(row.options_trade_id, {
      clientId: row.client_id,
      included: row.included_in_pool,
      allocationId: row.id,
      tradeProfitLoss: Number(row.trade_profit_loss),
      myShareAmount: Number(row.my_share_amount),
      clientShareAmount: Number(row.client_share_amount),
      status: row.status,
    });
  }
  return map;
}
