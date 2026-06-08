/**
 * Phase 16F — Full CRUD smoke test (Supabase REST + dev-service-role).
 * Usage: NODE_ENV=development node --env-file=.env.local scripts/smoke-phase-16f-crud.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const devUserId = process.env.SUPABASE_DEV_USER_ID?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const smokeTag = "SMOK16F";

function resolveAccessMode() {
  const supabaseConfigured = Boolean(url && anonKey);
  const devServiceRole =
    process.env.NODE_ENV === "development" &&
    uuidRe.test(devUserId ?? "") &&
    Boolean(serviceKey);

  if (!supabaseConfigured) return { layer: "mock-store", mode: "unconfigured" };
  if (devServiceRole)
    return { layer: "supabase", mode: "dev-service-role", userId: devUserId };
  return { layer: "fallback-or-session", mode: "production-session-or-fallback" };
}

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
  const endpoint = `${url}/rest/v1/${table}${query}`;
  const res = await fetch(endpoint, {
    method,
    headers: headers(prefer),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data, text: text.slice(0, 300) };
}

async function createRow(table, row, prefer = "return=representation") {
  return rest("POST", table, { body: row, prefer });
}

async function readRow(table, id) {
  return rest("GET", table, { query: `?id=eq.${id}&select=*` });
}

async function readByFilter(table, filter) {
  return rest("GET", table, { query: `?${filter}&select=*` });
}

async function updateRow(table, id, patch) {
  return rest("PATCH", table, {
    query: `?id=eq.${id}`,
    body: patch,
    prefer: "return=representation",
  });
}

async function deleteRow(table, id) {
  return rest("DELETE", table, { query: `?id=eq.${id}` });
}

function stepResult(name, ok, detail) {
  return { step: name, ok, detail: detail ?? null };
}

function moduleResult(name, route, table, steps, extra = {}) {
  const failed = steps.filter((s) => !s.ok);
  return {
    module: name,
    route,
    table,
    passed: failed.length === 0,
    steps,
    ...extra,
  };
}

/** @type {Record<string, { mockWhen: string; queryPattern: string }>} */
const MOCK_FALLBACK_MAP = {
  "Portfolio History": {
    mockWhen: "!isSupabaseConfigured() or no resolveSupabaseServerAccess() on write",
    queryPattern: "custom resolveSupabaseServerAccess + mock store (not withSupabaseQuery)",
  },
  "Monthly Contributions": {
    mockWhen: "!isSupabaseConfigured() or !withSupabaseQuery access",
    queryPattern: "readSupabasePrimary + withSupabaseQuery",
  },
  "Stock & ETF Holdings": {
    mockWhen: "!isSupabaseConfigured() or !withSupabaseQuery access",
    queryPattern: "readSupabasePrimary + withSupabaseQuery",
  },
  "Crypto Holdings": {
    mockWhen: "!isSupabaseConfigured() or !withSupabaseQuery access",
    queryPattern: "readSupabasePrimary + withSupabaseQuery",
  },
  "Options Trades": {
    mockWhen: "!isSupabaseConfigured() or !withSupabaseQuery access",
    queryPattern: "readSupabasePrimary + withSupabaseQuery",
  },
  "Dividend Records": {
    mockWhen: "!isSupabaseConfigured() or !withSupabaseQuery access",
    queryPattern: "withSupabaseQuery (reads + writes)",
  },
  "Client Profit Sharing": {
    mockWhen: "!isSupabaseConfigured() or !withSupabaseQuery access",
    queryPattern: "readSupabasePrimary + withSupabaseQuery",
  },
  "Support / Resistance": {
    mockWhen: "!isSupabaseConfigured() in watchlist.ts actions",
    queryPattern: "direct createClient() — not withSupabaseQuery",
  },
  Watchlist: {
    mockWhen: "!isSupabaseConfigured() in watchlist.ts actions",
    queryPattern: "direct createClient() — not withSupabaseQuery",
  },
  "Data Health Logs": {
    mockWhen: "!isSupabaseConfigured() or insert error → mock store",
    queryPattern: "withSupabaseQuery + append-only (no U/D in app)",
  },
};

async function testPortfolioHistory(userId) {
  const id = uid();
  const snapshotDate = "2099-01-15";
  const steps = [];
  const table = "daily_portfolio_snapshots";

  const row = {
    id,
    user_id: userId,
    snapshot_date: snapshotDate,
    portfolio_value_sgd: 1000,
    stock_options_value_sgd: 500,
    crypto_value_sgd: 100,
    usd_cash: 0,
    sgd_cash: 0,
    usd_cash_sgd_equivalent: 0,
    crypto_cash_sgd: 0,
    us_etf_value_sgd: 0,
    us_stock_value_sgd: 0,
    sg_stock_value_sgd: 0,
    current_options_value_sgd: 0,
    open_risk: 0,
    available_risk_capacity: 0,
    personal_unrealized_pnl: 0,
    personal_realized_pnl: 0,
    client_pnl: 0,
    client_initial_capital_sgd: 0,
    client_current_value_sgd: 0,
    portfolio_health_score: null,
    notes: `${smokeTag} portfolio history`,
    is_manual_entry: true,
    entered_by: "user",
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(
    stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`)
  );

  const r = await readRow(table, id);
  const readOk =
    r.ok && Array.isArray(r.data) && r.data[0]?.notes?.includes(smokeTag);
  steps.push(stepResult("read", readOk, readOk ? "found" : r.text));

  const u = await updateRow(table, id, {
    portfolio_value_sgd: 1500,
    notes: `${smokeTag} portfolio history edited`,
    updated_at: now(),
  });
  steps.push(
    stepResult(
      "update",
      u.ok && u.data?.[0]?.portfolio_value_sgd === 1500,
      u.ok ? "1500 SGD" : `${u.status}: ${u.text}`
    )
  );

  const refresh = await readRow(table, id);
  const refreshOk =
    refresh.ok &&
    refresh.data?.[0]?.portfolio_value_sgd === 1500 &&
    refresh.data?.[0]?.notes?.includes("edited");
  steps.push(stepResult("refresh", refreshOk, refreshOk ? "persisted" : refresh.text));

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, d.ok ? "removed" : `${d.status}: ${d.text}`));

  const gone = await readRow(table, id);
  steps.push(
    stepResult(
      "delete-verify",
      gone.ok && Array.isArray(gone.data) && gone.data.length === 0,
      "row absent"
    )
  );

  return moduleResult("Portfolio History", "/goals", table, steps, {
    source: "supabase",
  });
}

async function testMonthlyContributions(userId) {
  const id = uid();
  const table = "monthly_contributions";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    contribution_month: 1,
    contribution_year: 2099,
    stock_options_amount_sgd: 100,
    crypto_amount_sgd: 50,
    total_amount_sgd: 150,
    notes: `${smokeTag} contribution`,
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult(
      "read",
      r.ok && r.data?.[0]?.total_amount_sgd === 150,
      r.data?.[0]?.total_amount_sgd
    )
  );

  const u = await updateRow(table, id, {
    stock_options_amount_sgd: 200,
    total_amount_sgd: 250,
    notes: `${smokeTag} contribution edited`,
    updated_at: now(),
  });
  steps.push(
    stepResult(
      "update",
      u.ok && u.data?.[0]?.total_amount_sgd === 250,
      u.data?.[0]?.total_amount_sgd
    )
  );

  const refresh = await readRow(table, id);
  steps.push(
    stepResult(
      "refresh",
      refresh.data?.[0]?.total_amount_sgd === 250,
      "persisted"
    )
  );

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, "removed"));

  return moduleResult("Monthly Contributions", "/goals", table, steps, {
    source: "supabase",
  });
}

async function testStockEtf(userId) {
  const id = uid();
  const ticker = `${smokeTag}STK`;
  const table = "stock_etf_holdings";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    ticker,
    asset_type: "stock",
    currency: "USD",
    sector: "Technology",
    total_invested_native: 1000,
    current_value_native: 1100,
    fx_rate_to_sgd: 1.35,
    total_invested_sgd: 1350,
    current_value_sgd: 1485,
    shares_held: 10,
    average_cost: 100,
    notes: `${smokeTag} stock`,
    last_updated: now(),
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readByFilter(table, `user_id=eq.${userId}&ticker=eq.${encodeURIComponent(ticker)}`);
  steps.push(
    stepResult(
      "read",
      r.ok && r.data?.[0]?.current_value_sgd === 1485,
      r.data?.[0]?.ticker
    )
  );

  const u = await updateRow(table, id, {
    current_value_sgd: 1600,
    notes: `${smokeTag} stock edited`,
    updated_at: now(),
  });
  steps.push(
    stepResult("update", u.ok && u.data?.[0]?.current_value_sgd === 1600, "1600 SGD")
  );

  const refresh = await readRow(table, id);
  steps.push(
    stepResult("refresh", refresh.data?.[0]?.current_value_sgd === 1600, "persisted")
  );

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, "removed"));

  return moduleResult("Stock & ETF Holdings", "/stocks", table, steps, {
    source: "supabase",
  });
}

async function testCrypto(userId) {
  const id = uid();
  const ticker = `${smokeTag}BTC`;
  const table = "crypto_holdings";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    asset_label: "BTC",
    ticker,
    total_invested_sgd: 500,
    current_value_sgd: 550,
    notes: `${smokeTag} crypto`,
    last_updated: now(),
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult("read", r.ok && r.data?.[0]?.current_value_sgd === 550, r.data?.[0]?.ticker)
  );

  const u = await updateRow(table, id, {
    current_value_sgd: 600,
    notes: `${smokeTag} crypto edited`,
    updated_at: now(),
  });
  steps.push(stepResult("update", u.ok && u.data?.[0]?.current_value_sgd === 600, "600 SGD"));

  const refresh = await readRow(table, id);
  steps.push(
    stepResult("refresh", refresh.data?.[0]?.current_value_sgd === 600, "persisted")
  );

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, "removed"));

  return moduleResult("Crypto Holdings", "/crypto", table, steps, { source: "supabase" });
}

async function testWatchlist(userId) {
  const id = uid();
  const ticker = smokeTag;
  const table = "watchlist";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    ticker,
    display_name: `${smokeTag} Test`,
    is_active: true,
    sort_order: 9999,
    watchlist_category: "Pullbacks",
    notes: `${smokeTag} watchlist`,
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult("read", r.ok && r.data?.[0]?.ticker === ticker, r.data?.[0]?.ticker)
  );

  // App has no update action — verify PATCH at DB layer
  const u = await updateRow(table, id, {
    notes: `${smokeTag} watchlist edited`,
    updated_at: now(),
  });
  steps.push(
    stepResult(
      "update",
      u.ok && u.data?.[0]?.notes?.includes("edited"),
      "REST PATCH (app: create/delete only)"
    )
  );

  const refresh = await readRow(table, id);
  steps.push(
    stepResult(
      "refresh",
      refresh.data?.[0]?.notes?.includes("edited"),
      "persisted"
    )
  );

  // Return id for S/R and options tests — delete deferred
  steps.push(
    stepResult("delete", true, "deferred — cleaned after dependent modules")
  );

  return moduleResult("Watchlist", "/watchlist", table, steps, {
    source: "supabase",
    watchlistId: id,
    ticker,
  });
}

async function testSupportResistance(userId, watchlistId, ticker) {
  const id = uid();
  const table = "support_resistance";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    watchlist_id: watchlistId,
    ticker,
    timeframe: "daily",
    support_1: 100,
    support_2: 95,
    resistance_1: 110,
    resistance_2: 115,
    notes: `${smokeTag} S/R`,
    update_date: "2099-01-01",
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult("read", r.ok && r.data?.[0]?.support_1 === 100, r.data?.[0]?.support_1)
  );

  // Upsert-style update (same watchlist_id + timeframe)
  const u = await updateRow(table, id, {
    support_1: 105,
    notes: `${smokeTag} S/R edited`,
    updated_at: now(),
  });
  steps.push(stepResult("update", u.ok && u.data?.[0]?.support_1 === 105, "105"));

  const refresh = await readRow(table, id);
  steps.push(
    stepResult("refresh", refresh.data?.[0]?.support_1 === 105, "persisted")
  );

  steps.push(
    stepResult(
      "delete",
      true,
      "app: no delete action — REST cleanup after test"
    )
  );

  const d = await deleteRow(table, id);
  steps.push(
    stepResult("delete-rest", d.ok, d.ok ? "REST cleanup ok" : `${d.status}: ${d.text}`)
  );

  return moduleResult("Support / Resistance", "/watchlist", table, steps, {
    source: "supabase",
  });
}

async function testOptionsTrades(userId, watchlistId) {
  const id = uid();
  const table = "options_trades";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    watchlist_id: watchlistId,
    ticker: smokeTag,
    strategy: "bull_put_spread",
    status: "open",
    entry_date: "2099-01-01",
    expiration_date: "2099-02-01",
    dte: 31,
    contracts: 1,
    credit_received: 100,
    max_risk: 400,
    current_pnl: 0,
    pnl_percent: 0,
    take_profit_target: 50,
    stop_loss_target: 200,
    short_strike_put: 100,
    long_strike_put: 95,
    short_strike_call: null,
    long_strike_call: null,
    notes: `${smokeTag} trade`,
    width: 5,
    current_value: 100,
    manual_current_option_value: null,
    system_current_option_value: null,
    current_value_source: "manual",
    current_value_updated_at: null,
    exit_debit: null,
    realized_pnl: null,
    buying_power_used: null,
    breakeven_put: null,
    breakeven_call: null,
    take_profit_price: null,
    stop_loss_price: null,
    trade_score: null,
    recommended_strategy: null,
    confidence_level: null,
    reason_for_entry: null,
    trade_ownership: "personal",
    client_id: null,
    my_profit_share_percent: 100,
    client_profit_share_percent: 0,
    is_client_trade: false,
    sell_call_coverage: null,
    shares_owned: null,
    parent_trade_id: null,
    original_cost: null,
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult("read", r.ok && r.data?.[0]?.credit_received === 100, r.data?.[0]?.status)
  );

  const u = await updateRow(table, id, {
    current_pnl: 25,
    notes: `${smokeTag} trade edited`,
    updated_at: now(),
  });
  steps.push(stepResult("update", u.ok && u.data?.[0]?.current_pnl === 25, "pnl=25"));

  const refresh = await readRow(table, id);
  steps.push(
    stepResult("refresh", refresh.data?.[0]?.current_pnl === 25, "persisted")
  );

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, "removed"));

  return moduleResult("Options Trades", "/trades", table, steps, { source: "supabase" });
}

async function testDividendRecords(userId) {
  const id = uid();
  const table = "dividend_records";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    holding_id: null,
    ticker: smokeTag,
    market: "US",
    category: "us_stock",
    ex_dividend_date: "2099-03-01",
    record_date: "2099-03-02",
    payment_date: "2099-03-15",
    dividend_per_share: 1.5,
    shares_held: 100,
    gross_dividend: 150,
    withholding_tax: 15,
    net_dividend: 135,
    currency: "USD",
    sgd_equivalent: 180,
    fx_rate_to_sgd: 1.35,
    source: "manual",
    status: "upcoming",
    is_manual_override: false,
    is_received: false,
    notes: `${smokeTag} dividend`,
    api_reference_id: null,
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult("read", r.ok && r.data?.[0]?.net_dividend === 135, r.data?.[0]?.ticker)
  );

  const u = await updateRow(table, id, {
    net_dividend: 140,
    notes: `${smokeTag} dividend edited`,
    updated_at: now(),
  });
  steps.push(stepResult("update", u.ok && u.data?.[0]?.net_dividend === 140, "140"));

  const refresh = await readRow(table, id);
  steps.push(
    stepResult("refresh", refresh.data?.[0]?.net_dividend === 140, "persisted")
  );

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, "removed"));

  return moduleResult("Dividend Records", "/dividends", table, steps, {
    source: "supabase",
  });
}

async function testClientProfitSharing(userId) {
  const id = uid();
  const table = "client_profiles";
  const steps = [];

  const row = {
    id,
    user_id: userId,
    client_name: `${smokeTag} Client`,
    capital_contributed: 10000,
    client_share_percent: 70,
    my_share_percent: 30,
    total_paid_to_client: 0,
    notes: `${smokeTag} client`,
    created_at: now(),
    updated_at: now(),
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult(
      "read",
      r.ok && r.data?.[0]?.client_name?.includes(smokeTag),
      r.data?.[0]?.client_name
    )
  );

  const u = await updateRow(table, id, {
    capital_contributed: 12000,
    notes: `${smokeTag} client edited`,
    updated_at: now(),
  });
  steps.push(
    stepResult(
      "update",
      u.ok && u.data?.[0]?.capital_contributed === 12000,
      "12000"
    )
  );

  const refresh = await readRow(table, id);
  steps.push(
    stepResult(
      "refresh",
      refresh.data?.[0]?.capital_contributed === 12000,
      "persisted"
    )
  );

  const d = await deleteRow(table, id);
  steps.push(stepResult("delete", d.ok, "removed"));

  return moduleResult("Client Profit Sharing", "/client-profit-sharing", table, steps, {
    source: "supabase",
  });
}

async function testDataHealthLogs(userId) {
  const id = uid();
  const table = "data_source_logs";
  const steps = [];
  const started = now();

  const row = {
    id,
    user_id: userId,
    source_name: `${smokeTag}_probe`,
    status: "success",
    records_updated: 1,
    records_failed: 0,
    error_message: null,
    started_at: started,
    completed_at: started,
    created_at: started,
  };

  const c = await createRow(table, row);
  steps.push(stepResult("create", c.ok, c.ok ? id : `${c.status}: ${c.text}`));

  const r = await readRow(table, id);
  steps.push(
    stepResult(
      "read",
      r.ok && r.data?.[0]?.source_name === `${smokeTag}_probe`,
      r.data?.[0]?.source_name
    )
  );

  steps.push(
    stepResult("update", true, "N/A — append-only audit log in app")
  );
  steps.push(
    stepResult("delete", true, "N/A — no user delete in app; REST cleanup follows")
  );

  const refresh = await readRow(table, id);
  steps.push(
    stepResult("refresh", refresh.data?.[0]?.source_name === `${smokeTag}_probe`, "persisted")
  );

  const d = await deleteRow(table, id);
  steps.push(
    stepResult("delete-rest", d.ok, d.ok ? "REST cleanup ok" : `${d.status}: ${d.text}`)
  );

  return moduleResult("Data Health Logs", "/data-health", table, steps, {
    source: "supabase",
    note: "Create + Read only in app; update/delete via REST cleanup",
  });
}

async function cleanupWatchlist(watchlistId) {
  if (!watchlistId) return;
  await deleteRow("watchlist", watchlistId);
}

async function main() {
  const access = resolveAccessMode();
  const report = {
    phase: "16F",
    timestamp: now(),
    access,
    transport: "Supabase REST (service role — query-layer proof)",
    modules: [],
    mockFallbackWhenUnconfigured: MOCK_FALLBACK_MAP,
  };

  if (access.layer !== "supabase" || !access.userId || !serviceKey) {
    report.error =
      "Cannot run live Supabase CRUD — need NODE_ENV=development + SUPABASE_DEV_USER_ID + SUPABASE_SERVICE_ROLE_KEY";
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const userId = access.userId;
  let watchlistId = null;

  try {
    report.modules.push(await testPortfolioHistory(userId));
    report.modules.push(await testMonthlyContributions(userId));
    report.modules.push(await testStockEtf(userId));
    report.modules.push(await testCrypto(userId));

    const wl = await testWatchlist(userId);
    watchlistId = wl.watchlistId;
    report.modules.push(wl);

    report.modules.push(
      await testSupportResistance(userId, watchlistId, wl.ticker)
    );
    report.modules.push(await testOptionsTrades(userId, watchlistId));
    report.modules.push(await testDividendRecords(userId));
    report.modules.push(await testClientProfitSharing(userId));
    report.modules.push(await testDataHealthLogs(userId));
  } finally {
    await cleanupWatchlist(watchlistId);
  }

  report.passed = report.modules.filter((m) => m.passed).map((m) => m.module);
  report.failed = report.modules
    .filter((m) => !m.passed)
    .map((m) => ({
      module: m.module,
      failedSteps: m.steps.filter((s) => !s.ok),
    }));
  report.usesMockFallbackInAppWhenUnconfigured = Object.keys(MOCK_FALLBACK_MAP);
  report.rlsOrUuidIssues = report.modules
    .flatMap((m) =>
      m.steps
        .filter((s) => !s.ok && /uuid|rls|policy|permission|42501|22P02/i.test(String(s.detail)))
        .map((s) => ({ module: m.module, step: s.step, detail: s.detail }))
    );

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message, stack: err.stack?.slice(0, 500) }));
  process.exit(1);
});
