import { buildCryptoTrackerSummary } from "@/lib/crypto/calculations";
import { enrichAllCryptoHoldings } from "@/lib/crypto/map-holding";
import type { CryptoTrackerData } from "@/lib/crypto/types";
import {
  deleteMockCryptoHolding,
  getMockCryptoHoldings,
  upsertMockCryptoHolding,
} from "@/lib/mock/crypto-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { CryptoHolding } from "@/types/database";

function buildData(
  rows: CryptoHolding[],
  dataSource: "supabase" | "mock"
): CryptoTrackerData {
  const holdings = enrichAllCryptoHoldings(rows);
  return {
    holdings,
    summary: buildCryptoTrackerSummary(holdings),
    dataSource,
  };
}

export async function getCryptoHoldingsRows(): Promise<CryptoHolding[]> {
  if (!isSupabaseConfigured()) {
    return getMockCryptoHoldings();
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return getMockCryptoHoldings();

    const { data, error } = await supabase
      .from("crypto_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("current_value_sgd", { ascending: false });

    if (error || !data?.length) return getMockCryptoHoldings();
    return data as CryptoHolding[];
  } catch {
    return getMockCryptoHoldings();
  }
}

export async function getCryptoTrackerData(): Promise<CryptoTrackerData> {
  if (!isSupabaseConfigured()) {
    return buildData(getMockCryptoHoldings(), "mock");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return buildData(getMockCryptoHoldings(), "mock");
    }

    const { data, error } = await supabase
      .from("crypto_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("current_value_sgd", { ascending: false });

    if (error || !data?.length) {
      return buildData(getMockCryptoHoldings(), "mock");
    }

    return buildData(data as CryptoHolding[], "supabase");
  } catch {
    return buildData(getMockCryptoHoldings(), "mock");
  }
}

export async function persistCryptoHolding(
  row: CryptoHolding,
  userId?: string
): Promise<CryptoHolding> {
  if (!isSupabaseConfigured() || !userId) {
    return upsertMockCryptoHolding({ ...row, user_id: userId ?? "mock-user" });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("crypto_holdings")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("ticker", row.ticker)
    .maybeSingle();

  const payload = {
    ...row,
    id: existing ? (existing as { id: string }).id : row.id,
    created_at: existing
      ? (existing as { created_at: string }).created_at
      : row.created_at,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("crypto_holdings")
    .upsert(payload as never, { onConflict: "user_id,ticker" });

  if (error) throw new Error(error.message);
  return payload;
}

export async function removeCryptoHolding(
  id: string,
  userId?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) {
    deleteMockCryptoHolding(id);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crypto_holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
