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
import { readSupabasePrimary } from "@/lib/supabase/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  MOCK_USER_ID,
  assertSupabaseWriteAccess,
  withSupabaseQuery,
} from "@/lib/supabase/resolve-user";
import type {
  ClientProfileRecord,
  ClientTradeAllocation,
  OptionsTrade,
} from "@/types/database";

async function fetchClientData(_userId: string): Promise<{
  clients: ClientProfileRecord[];
  allocations: ClientTradeAllocation[];
}> {
  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const [clientsRes, allocRes] = await Promise.all([
        supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", userId)
          .order("client_name"),
        supabase
          .from("client_trade_allocations")
          .select("*")
          .eq("user_id", userId),
      ]);

      if (clientsRes.error || allocRes.error) {
        return { clients: [], allocations: [] };
      }

      return {
        clients: (clientsRes.data ?? []) as ClientProfileRecord[],
        allocations: (allocRes.data ?? []) as ClientTradeAllocation[],
      };
    },
    () => ({ clients: [], allocations: [] })
  );
}

export async function getClientProfitSharingData(
  activeClientId?: string | null
): Promise<ClientProfitSharingData> {
  const tradesData = await getOptionsTradesData();

  const { value, dataSource } = await readSupabasePrimary({
    module: "getClientProfitSharingData",
    mock: () =>
      buildClientProfitSharingData({
        clients: [],
        allocations: [],
        trades: tradesData.trades,
        activeClientId,
        dataSource: "mock",
      }),
    empty: () =>
      buildClientProfitSharingData({
        clients: [],
        allocations: [],
        trades: tradesData.trades,
        activeClientId,
        dataSource: "supabase",
      }),
    read: async (userId) => {
      const { clients, allocations } = await fetchClientData(userId);
      return buildClientProfitSharingData({
        clients,
        allocations,
        trades: tradesData.trades,
        activeClientId,
        dataSource: "supabase",
      });
    },
  });

  return { ...value, dataSource };
}

export async function getClientProfilesForSelect(): Promise<
  ClientProfileRecord[]
> {
  const { value } = await readSupabasePrimary({
    module: "getClientProfilesForSelect",
    mock: () => [],
    empty: () => [],
    read: async (userId) => (await fetchClientData(userId)).clients,
  });
  return value;
}

export async function persistProfitSharingClient(
  row: ClientProfileRecord,
  userId?: string
): Promise<ClientProfileRecord> {
  if (!isSupabaseConfigured()) {
    const { upsertMockProfitSharingClient } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    return upsertMockProfitSharingClient({ ...row, user_id: userId ?? MOCK_USER_ID });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("client_profiles")
        .upsert({ ...row, user_id: effectiveUserId } as never, { onConflict: "id" });

      if (error) throw new Error(error.message);
      return { ...row, user_id: effectiveUserId };
    },
    async () => {
      assertSupabaseWriteAccess();
    }
  );
}

export async function removeProfitSharingClient(
  id: string,
  _userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const { deleteMockProfitSharingClient } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    deleteMockProfitSharingClient(id);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { error } = await supabase
        .from("client_profiles")
        .delete()
        .eq("id", id)
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
    },
    () => {
      assertSupabaseWriteAccess();
    }
  );
}

export async function getTradeAllocationByTradeId(
  tradeId: string,
  _userId?: string
): Promise<ClientTradeAllocation | null> {
  if (!isSupabaseConfigured()) {
    return getMockTradeAllocationByTradeId(tradeId) ?? null;
  }

  return withSupabaseQuery(
    async ({ userId, supabase }) => {
      const { data } = await supabase
        .from("client_trade_allocations")
        .select("*")
        .eq("options_trade_id", tradeId)
        .eq("user_id", userId)
        .maybeSingle();

      return (data as ClientTradeAllocation | null) ?? null;
    },
    () => getMockTradeAllocationByTradeId(tradeId) ?? null
  );
}

export async function persistTradeAllocation(
  row: ClientTradeAllocation,
  userId?: string
): Promise<ClientTradeAllocation> {
  if (!isSupabaseConfigured()) {
    const { setMockTradeAllocation } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    return setMockTradeAllocation({ ...row, user_id: userId ?? MOCK_USER_ID });
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: existing } = await supabase
        .from("client_trade_allocations")
        .select("id, created_at, status")
        .eq("client_id", row.client_id)
        .eq("options_trade_id", row.options_trade_id)
        .maybeSingle();

      const payload = {
        ...row,
        user_id: effectiveUserId,
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
    },
    async () => {
      assertSupabaseWriteAccess();
    }
  );
}

export async function removeTradeAllocation(
  tradeId: string,
  _userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    removeMockTradeAllocation(tradeId);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      await supabase
        .from("client_trade_allocations")
        .delete()
        .eq("options_trade_id", tradeId)
        .eq("user_id", effectiveUserId);
    },
    () => {
      assertSupabaseWriteAccess();
    }
  );
}

export async function syncClientTradeAllocation(
  trade: OptionsTrade,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    if (!trade.is_client_trade || !trade.client_id) {
      await removeTradeAllocation(trade.id, MOCK_USER_ID);
      return;
    }
    const existing = await getTradeAllocationByTradeId(trade.id);
    const allocation = buildClientTradeAllocation(trade, MOCK_USER_ID, existing);
    if (!allocation) return;
    await persistTradeAllocation(allocation, MOCK_USER_ID);
    return;
  }

  await withSupabaseQuery(
    async ({ userId: effectiveUserId }) => {
      if (!trade.is_client_trade || !trade.client_id) {
        await removeTradeAllocation(trade.id, effectiveUserId);
        return;
      }

      const existing = await getTradeAllocationByTradeId(trade.id, effectiveUserId);
      const allocation = buildClientTradeAllocation(trade, effectiveUserId, existing);
      if (!allocation) return;
      await persistTradeAllocation(allocation, effectiveUserId);
    },
    () => {
      assertSupabaseWriteAccess();
    }
  );
}

export async function markAllocationPaid(
  allocationId: string,
  _userId?: string
): Promise<ClientTradeAllocation> {
  if (!isSupabaseConfigured()) {
    const uid = _userId ?? MOCK_USER_ID;
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

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: row, error: fetchErr } = await supabase
        .from("client_trade_allocations")
        .select("*")
        .eq("id", allocationId)
        .eq("user_id", effectiveUserId)
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
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);

      if (Number(allocation.client_share_amount) > 0) {
        await recordClientPayment(
          allocation.client_id,
          Number(allocation.client_share_amount),
          effectiveUserId
        );
      }

      return updated;
    },
    () => {
      assertSupabaseWriteAccess();
    }
  );
}

export async function recordClientPayment(
  clientId: string,
  amount: number,
  _userId?: string
): Promise<ClientProfileRecord> {
  if (!isSupabaseConfigured()) {
    const { recordMockClientPayment } = await import(
      "@/lib/mock/client-profit-sharing-store"
    );
    const updated = recordMockClientPayment(clientId, amount);
    if (!updated) throw new Error("Client not found.");
    return updated;
  }

  return withSupabaseQuery(
    async ({ userId: effectiveUserId, supabase }) => {
      const { data: client, error: fetchErr } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("id", clientId)
        .eq("user_id", effectiveUserId)
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
        .eq("user_id", effectiveUserId);

      if (error) throw new Error(error.message);
      return updated;
    },
    () => {
      assertSupabaseWriteAccess();
    }
  );
}
