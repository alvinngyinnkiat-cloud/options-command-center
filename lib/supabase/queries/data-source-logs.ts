import type { DataSourceLogStatus } from "@/lib/data-health/types";
import {
  getMockDataSourceLogs,
  insertMockDataSourceLog,
} from "@/lib/mock/data-source-logs-store";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import type { DataSourceLogRow } from "@/types/database";
import { randomUUID } from "crypto";

export async function listDataSourceLogs(
  userId: string,
  limit = 50
): Promise<DataSourceLogRow[]> {
  if (!isSupabaseConfigured()) {
    return getMockDataSourceLogs(userId).slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_source_logs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as DataSourceLogRow[];
}

export async function appendDataSourceLog(input: {
  userId: string;
  sourceName: string;
  status: DataSourceLogStatus;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}): Promise<DataSourceLogRow> {
  const row: DataSourceLogRow = {
    id: randomUUID(),
    user_id: input.userId,
    source_name: input.sourceName,
    status: input.status,
    records_updated: input.recordsUpdated,
    records_failed: input.recordsFailed,
    error_message: input.errorMessage ?? null,
    started_at: input.startedAt,
    completed_at: input.completedAt ?? new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    return insertMockDataSourceLog(row);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_source_logs")
    .insert(row as never)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DataSourceLogRow;
}

export async function getLastLogForSource(
  userId: string,
  sourceName: string
): Promise<{ success: DataSourceLogRow | null; failed: DataSourceLogRow | null }> {
  const logs = await listDataSourceLogs(userId, 100);
  const filtered = logs.filter((l) => l.source_name === sourceName);
  const success =
    filtered.find((l) => l.status === "success" || l.status === "partial") ??
    null;
  const failed = filtered.find((l) => l.status === "failed") ?? null;
  return { success, failed };
}
