/**
 * Phase 16D — Financial Goals query-layer probe (read-only Supabase REST).
 * Usage: node --env-file=.env.local scripts/smoke-financial-goals-probe.mjs [label]
 */

const label = process.argv[2] ?? "probe";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const devUserId = process.env.SUPABASE_DEV_USER_ID?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveAccessMode() {
  const supabaseConfigured = Boolean(url && anonKey);
  const devServiceRole =
    process.env.NODE_ENV === "development" &&
    uuidRe.test(devUserId ?? "") &&
    Boolean(serviceKey);

  if (!supabaseConfigured) return { layer: "mock-store", mode: "unconfigured" };
  if (devServiceRole)
    return {
      layer: "supabase",
      mode: "dev-service-role",
      userId: devUserId,
    };
  return {
    layer: "fallback-or-session",
    mode: "production-session-or-fallback",
    userId: devUserId ?? null,
  };
}

async function fetchGoals(userId) {
  const endpoint = `${url}/rest/v1/financial_goals?user_id=eq.${userId}&select=id,name,goal_type,target_amount,updated_at,is_active,is_archived&order=updated_at.desc`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase REST ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const access = resolveAccessMode();
  const smokePrefix = "CRUD Smoke";

  console.log(JSON.stringify({ label, timestamp: new Date().toISOString(), access }, null, 2));

  if (access.layer !== "supabase" || !access.userId || !serviceKey) {
    console.log(
      JSON.stringify({
        label,
        supabaseQuery: "skipped",
        reason: "No dev-service-role access — reads/writes likely mock or fallback",
      })
    );
    return;
  }

  const rows = await fetchGoals(access.userId);
  const smokeRows = rows.filter((r) => r.name?.includes(smokePrefix));

  console.log(
    JSON.stringify(
      {
        label,
        supabaseQuery: {
          table: "financial_goals",
          filter: `user_id=eq.${access.userId}`,
          transport: "REST (service role — query-layer proof)",
          totalRows: rows.length,
          smokeTestRows: smokeRows.map((r) => ({
            id: r.id,
            name: r.name,
            target_amount: r.target_amount,
            updated_at: r.updated_at,
          })),
          latestFive: rows.slice(0, 5).map((r) => ({
            id: r.id,
            name: r.name,
            updated_at: r.updated_at,
          })),
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ label, error: err.message }));
  process.exit(1);
});
