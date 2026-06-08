import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";
import {
  getDevUserId,
  isValidSupabaseUserId,
  resolveSessionUserId,
} from "@/lib/supabase/user-id";
import type { Database } from "@/types/database";

export type SupabaseWriteMode = "production-session" | "dev-service-role";

export interface SupabaseServerAccess {
  mode: SupabaseWriteMode;
  userId: string;
}

export type ServerSupabaseClient = SupabaseClient<Database>;

export function isDevServerWriteModeEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !!getDevUserId() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export async function resolveSupabaseServerAccess(): Promise<SupabaseServerAccess | null> {
  if (!isSupabaseConfigured()) return null;

  const sessionUser = await resolveSessionUserId();
  if (isValidSupabaseUserId(sessionUser)) {
    return { mode: "production-session", userId: sessionUser };
  }

  if (isDevServerWriteModeEnabled()) {
    return { mode: "dev-service-role", userId: getDevUserId()! };
  }

  return null;
}

export async function getServerSupabaseClient(
  access: SupabaseServerAccess
): Promise<ServerSupabaseClient> {
  if (access.mode === "dev-service-role") {
    return createAdminClient();
  }
  return createClient();
}

/** Server-side Supabase read/write context. Never uses mock-user when configured. */
export async function withSupabaseQuery<T>(
  run: (ctx: {
    userId: string;
    supabase: ServerSupabaseClient;
    mode: SupabaseWriteMode;
  }) => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  if (!isSupabaseConfigured()) {
    return fallback();
  }

  const access = await resolveSupabaseServerAccess();
  if (!access) {
    return fallback();
  }

  const supabase = await getServerSupabaseClient(access);
  return run({
    userId: access.userId,
    supabase,
    mode: access.mode,
  });
}
