import { buildClientProfitSharingData } from "@/lib/client-profit-sharing/page-data";
import { buildClientTradeAllocation } from "@/lib/client-profit-sharing/sync-allocation";
import type { ClientProfitSharingData } from "@/lib/client-profit-sharing/types";
import {
  getMockProfitSharingAllocations,
  getMockProfitSharingClients,
  getMockTradeAllocationByTradeId,
  removeMockTradeAllocation,
} from "@/lib/mock/client-profit-sharing-store";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type {
  ClientProfileRecord,
  ClientTradeAllocation,
  OptionsTrade,
} from "@/types/database";

export async function getClientProfitSharingData(
  activeClientId?: string | null
): Promise<ClientProfitSharingData> {
  const tradesData = await getOptionsTradesData();

  if (!isSupabaseConfigured()) {
    return buildClientProfitSharingData({
      clients: getMockProfitSharingClients(),
      allocations: getMockProfitSharingAllocations(),
      trades: tradesData.trades,
      activeClientId,
      dataSource: "mock",
    });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return buildClientProfitSharingData({
        clients: getMockProfitSharingClients(),
        allocations: getMockProfitSharingAllocations(),
        trades: tradesData.trades,
        activeClientId,
        dataSource: "mock",
      });
    }

    const [clientsRes, allocRes] = await Promise.all([
      supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("client_name"),
      supabase
        .from("client_trade_allocations")
        .select("*")
        .eq("user_id", user.id),
    ]);

    const clients = (clientsRes.data ?? []) as ClientProfileRecord[];
    const allocations = (allocRes.data ?? []) as ClientTradeAllocation[];

    if (clients.length === 0) {
      return buildClientProfitSharingData({
        clients: getMockProfitSharingClients(),
        allocations: getMockProfitSharingAllocations(),
        trades: tradesData.trades,
        activeClientId,
        dataSource: "mock",
      });
    }

    return buildClientProfitSharingData({
      clients,
      allocations,
      trades: tradesData.trades,
      activeClientId,
      dataSource: "supabase",
    });
  } catch {
    return buildClientProfitSharingData({
      clients: getMockProfitSharingClients(),
      allocations: getMockProfitSharingAllocations(),
      trades: tradesData.trades,
      activeClientId,
      dataSource: "mock",
    });
  }
}

export async function getClientProfilesForSelect(): Promise<
  ClientProfileRecord[]
> {
  if (!isSupabaseConfigured()) {
    return getMockProfitSharingClients();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return getMockProfitSharingClients();

    const { data } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("client_name");

    const clients = (data ?? []) as ClientProfileRecord[];
    return clients.length > 0 ? clients : getMockProfitSharingClients();
  } catch {
    return getMockProfitSharingClients();
  }
}

export async function persistProfitSharingClient(
  row: ClientProfileRecord,
  userId?: string
): Promise<ClientProfileRecord> {
  if (!isSupabaseConfigured() || !userId) {
    const { upsertMockProfitSharingClient } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    return upsertMockProfitSharingClient({ ...row, user_id: userId ?? "mock-user" });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_profiles")
    .upsert(row as never, { onConflict: "id" });

  if (error) throw new Error(error.message);
  return row;
}

export async function removeProfitSharingClient(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    const { deleteMockProfitSharingClient } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    deleteMockProfitSharingClient(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function getTradeAllocationByTradeId(
  tradeId: string,
  userId?: string
): Promise<ClientTradeAllocation | null> {
  if (!isSupabaseConfigured() || !userId) {
    return getMockTradeAllocationByTradeId(tradeId) ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("client_trade_allocations")
    .select("*")
    .eq("options_trade_id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ClientTradeAllocation | null) ?? null;
}

export async function persistTradeAllocation(
  row: ClientTradeAllocation,
  userId?: string
): Promise<ClientTradeAllocation> {
  if (!isSupabaseConfigured() || !userId) {
    const { setMockTradeAllocation } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    return setMockTradeAllocation({ ...row, user_id: userId ?? "mock-user" });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("client_trade_allocations")
    .select("id, created_at, status")
    .eq("client_id", row.client_id)
    .eq("options_trade_id", row.options_trade_id)
    .maybeSingle();

  const payload = {
    ...row,
    id: existing ? (existing as { id: string }).id : row.id,
    created_at: existing
      ? (existing as { created_at: string }).created_at
      : row.created_at,
    status: existing
      ? (existing as { status: ClientTradeAllocation["status"] }).status ===
        "Paid"
        ? "Paid"
        : row.status
      : row.status,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_trade_allocations")
    .upsert(payload as never, { onConflict: "client_id,options_trade_id" });

  if (error) throw new Error(error.message);
  return payload;
}

export async function removeTradeAllocation(
  tradeId: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    removeMockTradeAllocation(tradeId);
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("client_trade_allocations")
    .delete()
    .eq("options_trade_id", tradeId)
    .eq("user_id", userId);
}

export async function syncClientTradeAllocation(
  trade: OptionsTrade,
  userId?: string
): Promise<void> {
  const uid = userId ?? "mock-user";
  if (!trade.is_client_trade || !trade.client_id) {
    await removeTradeAllocation(trade.id, uid);
    return;
  }

  const existing = await getTradeAllocationByTradeId(trade.id, uid);
  const allocation = buildClientTradeAllocation(trade, uid, existing);
  if (!allocation) return;
  await persistTradeAllocation(allocation, uid);
}

export async function markAllocationPaid(
  allocationId: string,
  userId?: string
): Promise<ClientTradeAllocation> {
  const uid = userId ?? "mock-user";

  if (!isSupabaseConfigured() || !uid || uid === "mock-user") {
    const { getMockProfitSharingAllocations, setMockTradeAllocation, recordMockClientPayment } =
      await import("@/lib/mock/client-profit-sharing-store");
    const row = getMockProfitSharingAllocations().find((a) => a.id === allocationId);
    if (!row) throw new Error("Allocation not found.");
    const updated: ClientTradeAllocation = {
      ...row,
      status: "Paid",
      updated_at: new Date().toISOString(),
    };
    setMockTradeAllocation(updated);
    if (row.client_share_amount > 0) {
      recordMockClientPayment(row.client_id, row.client_share_amount);
    }
    return updated;
  }

  const supabase = await createClient();
  const { data: row, error: fetchErr } = await supabase
    .from("client_trade_allocations")
    .select("*")
    .eq("id", allocationId)
    .eq("user_id", uid)
    .maybeSingle();

  if (fetchErr || !row) throw new Error("Allocation not found.");

  const allocation = row as ClientTradeAllocation;
  const updated: ClientTradeAllocation = {
    ...allocation,
    status: "Paid",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_trade_allocations")
    .update({ status: "Paid", updated_at: updated.updated_at } as never)
    .eq("id", allocationId)
    .eq("user_id", uid);

  if (error) throw new Error(error.message);

  if (Number(allocation.client_share_amount) > 0) {
    await recordClientPayment(
      allocation.client_id,
      Number(allocation.client_share_amount),
      uid
    );
  }

  return updated;
}

export async function recordClientPayment(
  clientId: string,
  amount: number,
  userId?: string
): Promise<ClientProfileRecord> {
  if (!isSupabaseConfigured() || !userId) {
    const { recordMockClientPayment } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    const updated = recordMockClientPayment(clientId, amount);
    if (!updated) throw new Error("Client not found.");
    return updated;
  }

  const supabase = await createClient();
  const { data: client, error: fetchErr } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("id", clientId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr || !client) throw new Error("Client not found.");

  const row = client as ClientProfileRecord;
  const updated: ClientProfileRecord = {
    ...row,
    total_paid_to_client: Number(row.total_paid_to_client) + amount,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_profiles")
    .update({ total_paid_to_client: updated.total_paid_to_client } as never)
    .eq("id", clientId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return updated;
}
