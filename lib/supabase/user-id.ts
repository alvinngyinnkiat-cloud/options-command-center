import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

export const MOCK_USER_ID = "mock-user";

export const MISSING_DEV_USER_ID_MESSAGE =
  "Missing SUPABASE_DEV_USER_ID for live writes.";

export const SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE =
  "Supabase Auth session required for live database access. For local dev without sign-in, set SUPABASE_DEV_USER_ID and SUPABASE_SERVICE_ROLE_KEY (server-only).";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getDevUserId(): string | undefined {
  const id = process.env.SUPABASE_DEV_USER_ID?.trim();
  return id && isValidSupabaseUserId(id) ? id : undefined;
}

export function isValidSupabaseUserId(
  userId: string | undefined | null
): userId is string {
  if (!userId || userId === MOCK_USER_ID) return false;
  return UUID_RE.test(userId);
}

export function isSupabaseRlsError(message: string): boolean {
  return /row-level security|RLS|Not authenticated|Not authorized/i.test(message);
}

export async function resolveSessionUserId(): Promise<string | undefined> {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id && isValidSupabaseUserId(user.id)) return user.id;
  return undefined;
}
