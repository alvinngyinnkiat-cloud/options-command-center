import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  isDevServerWriteModeEnabled,
  isServiceRoleUserFallbackEnabled,
  resolveSupabaseServerAccess,
} from "@/lib/supabase/server-write";
import {
  MOCK_USER_ID,
  MISSING_DEV_USER_ID_MESSAGE,
  SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE,
  getDevUserId,
  isValidSupabaseUserId,
  resolveSessionUserId,
} from "@/lib/supabase/user-id";

export {
  MOCK_USER_ID,
  MISSING_DEV_USER_ID_MESSAGE,
  SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE,
  getDevUserId,
  isValidSupabaseUserId,
  isSupabaseRlsError,
  resolveSessionUserId,
} from "@/lib/supabase/user-id";

export {
  isDevServerWriteModeEnabled,
  isServiceRoleUserFallbackEnabled,
  resolveSupabaseServerAccess,
  getServerSupabaseClient,
  withSupabaseQuery,
  type SupabaseWriteMode,
  type SupabaseServerAccess,
} from "@/lib/supabase/server-write";

export class NotAuthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}

export function warnMissingDevUserIdForWrite(): void {
  if (getDevUserId() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.warn(
      `${MISSING_DEV_USER_ID_MESSAGE} Set SUPABASE_SERVICE_ROLE_KEY for dev server writes.`
    );
    return;
  }
  console.warn(SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE);
}

/** Throws when Supabase is configured but no session or dev write credentials exist. */
export function assertSupabaseWriteAccess(): never {
  throw new NotAuthenticatedError(SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE);
}

export async function resolveAuthenticatedUserId(): Promise<string | undefined> {
  const sessionUser = await resolveSessionUserId();
  if (sessionUser) return sessionUser;
  if (isServiceRoleUserFallbackEnabled()) return getDevUserId();
  return undefined;
}

export async function resolveSupabaseWriteUserId(
  _callerUserId?: string
): Promise<string | null> {
  const access = await resolveSupabaseServerAccess();
  return access?.userId ?? null;
}

export async function resolveSupabaseReadUserId(
  _callerUserId?: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  const access = await resolveSupabaseServerAccess();
  return access?.userId ?? null;
}

export async function requireUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;

  const access = await resolveSupabaseServerAccess();
  if (access) return access.userId;

  throw new NotAuthenticatedError(SUPABASE_AUTH_SESSION_REQUIRED_MESSAGE);
}

export async function resolveUserId(): Promise<string> {
  if (!isSupabaseConfigured()) return MOCK_USER_ID;
  const id = await resolveAuthenticatedUserId();
  return isValidSupabaseUserId(id) ? id! : MOCK_USER_ID;
}
