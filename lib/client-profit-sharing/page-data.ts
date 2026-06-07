import type { EnrichedTrade } from "@/lib/trades/types";
import {
  buildClientProfitSharingSummary,
  buildTradeAllocationRows,
} from "./calculations";
import { allocationMapFromRows, mapClientProfile } from "./map-client";
import type { ClientProfitSharingData } from "./types";
import type {
  ClientProfileRecord,
  ClientTradeAllocation,
} from "@/types/database";

export function buildClientProfitSharingData(input: {
  clients: ClientProfileRecord[];
  allocations: ClientTradeAllocation[];
  trades: EnrichedTrade[];
  activeClientId?: string | null;
  dataSource: "supabase" | "mock";
}): ClientProfitSharingData {
  const profiles = input.clients.map(mapClientProfile);
  const activeClientId =
    input.activeClientId ?? profiles[0]?.id ?? null;

  const allocMap = allocationMapFromRows(input.allocations);
  const tradeAllocations = buildTradeAllocationRows(
    profiles,
    input.trades,
    allocMap
  );
  const summary = buildClientProfitSharingSummary(profiles, tradeAllocations);

  return {
    clients: profiles,
    activeClientId,
    tradeAllocations,
    summary,
    dataSource: input.dataSource,
  };
}
