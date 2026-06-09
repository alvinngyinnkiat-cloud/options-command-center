/**
 * Phase 16G.3 post-migration verification (dev-service-role).
 * Usage: NODE_ENV=development node --env-file=.env.local scripts/verify-16g3-portfolio-overrides.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const devUserId = process.env.SUPABASE_DEV_USER_ID?.trim();
const tag = `16G3-${Date.now()}`;

function headers(prefer) {
  const h = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

async function rest(method, table, { query = "", body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers: headers(prefer),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data, text: text.slice(0, 500) };
}

async function readOverride() {
  return rest("GET", "portfolio_overrides", {
    query: `?user_id=eq.${devUserId}&select=*`,
  });
}

async function upsertOverride(patch) {
  const existing = await readOverride();
  const row = existing.ok && Array.isArray(existing.data) ? existing.data[0] : null;
  const payload = {
    id: row?.id ?? crypto.randomUUID(),
    user_id: devUserId,
    use_manual_override: row?.use_manual_override ?? false,
    manual_usd_sgd_rate: row?.manual_usd_sgd_rate ?? 1.35,
    manual_total_portfolio_value_sgd: row?.manual_total_portfolio_value_sgd ?? null,
    manual_stocks_value_sgd: row?.manual_stocks_value_sgd ?? null,
    manual_etfs_value_sgd: row?.manual_etfs_value_sgd ?? null,
    manual_crypto_value_sgd: row?.manual_crypto_value_sgd ?? null,
    manual_cash_value_sgd: row?.manual_cash_value_sgd ?? null,
    manual_us_stocks_options_value_usd: row?.manual_us_stocks_options_value_usd ?? null,
    manual_us_stocks_options_sgd_equivalent:
      row?.manual_us_stocks_options_sgd_equivalent ?? null,
    manual_sg_stocks_cash_value_sgd: row?.manual_sg_stocks_cash_value_sgd ?? null,
    manual_trading_cash_usd: row?.manual_trading_cash_usd ?? null,
    manual_trading_cash_sgd: row?.manual_trading_cash_sgd ?? null,
    override_reason: row?.override_reason ?? null,
    override_updated_at: new Date().toISOString(),
    created_at: row?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...patch,
  };
  return rest("POST", "portfolio_overrides", {
    query: "?on_conflict=user_id",
    body: payload,
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

function assertField(row, field, expected, step) {
  const actual = row?.[field];
  const pass = actual === expected || Number(actual) === Number(expected);
  return {
    step,
    pass,
    expected,
    actual,
  };
}

async function main() {
  const results = [];

  if (!url || !serviceKey || !devUserId) {
    console.log(JSON.stringify({ ok: false, error: "Missing env vars" }, null, 2));
    process.exit(1);
  }

  // 1. Save Trading Cash
  const tradingUsd = 1234.56;
  const tradingSgd = 6914.9;
  const saveCash = await upsertOverride({
    manual_trading_cash_usd: tradingUsd,
    manual_trading_cash_sgd: tradingSgd,
    manual_cash_value_sgd: tradingSgd,
  });
  results.push({
    test: "Save Trading Cash (upsert)",
    pass: saveCash.ok,
    status: saveCash.status,
    error: saveCash.ok ? null : saveCash.text,
  });

  const refresh1 = await readOverride();
  const row1 = refresh1.data?.[0];
  results.push(
    assertField(row1, "manual_trading_cash_usd", tradingUsd, "Trading Cash USD persisted"),
    assertField(row1, "manual_trading_cash_sgd", tradingSgd, "Trading Cash SGD persisted")
  );

  // 2. Save Reconciliation Notes
  const note = `Reconciliation note ${tag}`;
  const saveNote = await upsertOverride({ override_reason: note });
  results.push({
    test: "Save Reconciliation Notes (upsert)",
    pass: saveNote.ok,
    status: saveNote.status,
    error: saveNote.ok ? null : saveNote.text,
  });

  const refresh2 = await readOverride();
  const row2 = refresh2.data?.[0];
  results.push({
    step: "Reconciliation notes persisted",
    pass: row2?.override_reason === note,
    expected: note,
    actual: row2?.override_reason,
  });

  // 3. Save Portfolio Override
  const overridePayload = {
    use_manual_override: true,
    manual_us_stocks_options_value_usd: 15675.89,
    manual_us_stocks_options_sgd_equivalent: 27149.08,
    manual_crypto_value_sgd: 0,
    manual_sg_stocks_cash_value_sgd: 9334,
    manual_total_portfolio_value_sgd: 36483.08,
    override_reason: note,
  };
  const saveOverride = await upsertOverride(overridePayload);
  results.push({
    test: "Save Portfolio Override (upsert)",
    pass: saveOverride.ok,
    status: saveOverride.status,
    error: saveOverride.ok ? null : saveOverride.text,
  });

  const refresh3 = await readOverride();
  const row3 = refresh3.data?.[0];
  results.push(
    assertField(row3, "use_manual_override", true, "use_manual_override persisted"),
    assertField(row3, "manual_total_portfolio_value_sgd", 36483.08, "manual total persisted"),
    assertField(row3, "manual_trading_cash_sgd", tradingSgd, "Trading Cash retained after override save")
  );

  const allPass = results.every((r) => r.pass !== false);
  console.log(JSON.stringify({ ok: allPass, tag, devUserId, results }, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
