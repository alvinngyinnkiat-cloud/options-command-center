import type { DataSource } from "@/lib/portfolio/types";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { resolveAuthenticatedUserId } from "@/lib/supabase/resolve-user";

export type ReadResult<T> = { value: T; dataSource: DataSource };

/**
 * Supabase-primary read: mock when unconfigured, empty on no user, mock only on catch.
 */
export async function readSupabasePrimary<T>(options: {
  module: string;
  mock: () => T | Promise<T>;
  empty: (userId: string) => T | Promise<T>;
  read: (userId: string) => T | Promise<T>;
}): Promise<ReadResult<T>> {
  if (!isSupabaseConfigured()) {
    return { value: await options.mock(), dataSource: "mock" };
  }

  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return { value: await options.empty("unauthenticated"), dataSource: "supabase" };
    }
    return { value: await options.read(userId), dataSource: "supabase" };
  } catch (err) {
    console.error(`[${options.module}] Supabase read failed, using mock fallback`, err);
    return { value: await options.mock(), dataSource: "mock" };
  }
}
