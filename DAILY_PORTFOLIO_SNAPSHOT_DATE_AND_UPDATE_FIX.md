# Daily Portfolio Snapshot Date & Update Fix

## Problems

1. **Daily Portfolio Value Tracker could not be updated manually** — Create Snapshot returned early when today's row was marked `is_manual_entry`, and the edit form did not load client/cash fields from existing records.
2. **Snapshot date showed 2099-01-15** — Smoke-test CRUD data (`scripts/smoke-phase-16f-crud.mjs`) inserted a far-future row; history used the last row by sort order, not today's anchor date.
3. **Values showed S$1,000.00** — Same smoke-test row (`portfolio_value_sgd: 1000`) surfaced as "latest".
4. **Client Current Value showed S$0.00** — Snapshot payload used profit-sharing `clientCurrentValue` instead of ownership-split `clientPortfolioSgd` from Manual Portfolio Breakdown.

## Root causes

| Symptom | Cause |
|--------|--------|
| 2099-01-15 date | `buildHistoryData` used `snapshots[snapshots.length - 1]`; smoke row had max date |
| S$1,000 values | Stale smoke-test snapshot in Supabase |
| Client S$0 | `buildDailySnapshotPayload` mapped `client_current_value_sgd` from profit-sharing tracker |
| Can't update | `upsertDailyPortfolioSnapshot` skipped rows where `is_manual_entry === true` |
| Wrong ensure date | Live mode passed `MOCK_REFERENCE_DATE` (2026-06-06) as `asOfDate` instead of today |

## Source of truth (Manual Portfolio Breakdown)

| Tracker field | Source |
|---------------|--------|
| My Portfolio Value | `totalPortfolioSgd − clientPortfolioSgd` |
| Client Current Value | `clientPortfolioSgd` (ownership split) |
| Total Assets Managed | `totalPortfolioSgd` (= my + client; DB generated column) |

## Changes

### `lib/portfolio/snapshot-date.ts` (new)
- `getLocalSnapshotDate()` — local calendar date (`yyyy-MM-dd`) for live snapshots.

### `lib/portfolio/daily-snapshot.ts`
- `client_current_value_sgd` now uses `capitalPools.clientPortfolioSgd`.
- Default snapshot date uses `getLocalSnapshotDate()`.

### `lib/portfolio/snapshot-history.ts`
- `selectLatestSnapshot()` — prefers today's row; ignores future dates (e.g. 2099 smoke data) when picking `history.latest`.

### `lib/supabase/queries/daily-portfolio-snapshots.ts`
- `resolveHistoryAsOfDate()` — today in Supabase mode, `MOCK_REFERENCE_DATE` only when Supabase is unavailable.
- `buildHistoryData` uses `selectLatestSnapshot`.
- `upsertDailyPortfolioSnapshot({ allowManualOverwrite })` — Create Snapshot can overwrite today's manual row.
- `getLatestDailySnapshot` / `getLatestDailySnapshotValue` exclude future dates.

### `app/actions/portfolio-snapshots.ts`
- Create Snapshot loads enriched capital pools, upserts **today** with `allowManualOverwrite: true`, and reloads history anchored to today.

### `app/actions/daily-portfolio-records.ts`
- Manual add/edit/delete reloads history via enriched metrics.

### UI fixes
- **`PortfolioHistoryFormModal`** — loads `clientCurrentValueSgd` from the record on edit.
- **`PortfolioHistoryTable`** — passes trading/crypto cash defaults from the full snapshot when editing.

## Create Snapshot behavior

On click:

1. `snapshot_date` = today's local date
2. `portfolio_value_sgd` = My Portfolio Value (ownership split)
3. `client_current_value_sgd` = Client Portfolio (ownership split)
4. `total_assets_managed_sgd` = generated (my + client = Total Portfolio)
5. Daily change computed from prior snapshot via existing `buildPerformanceMetrics`
6. If today's row exists → update (including prior manual entries)
7. Client state refreshed via returned `history` + `revalidatePath`

## Mock / fallback

- Mock snapshot history and `MOCK_REFERENCE_DATE` apply **only** when Supabase is not configured.
- Live mode no longer uses mock reference date for comparisons or auto-ensure.
- Far-future rows remain in DB for smoke tests but are excluded from "latest" display.

## Tests

- `lib/portfolio/snapshot-history.test.ts` — future-date exclusion
- `lib/portfolio/daily-snapshot.test.ts` — ownership-split payload mapping

## Verification

```bash
npx vitest run lib/portfolio/daily-snapshot.test.ts lib/portfolio/snapshot-history.test.ts
npm run build
```

After deploy: open **Goals → Daily Portfolio Value Tracker**, confirm today's date and real breakdown values; click **Create Snapshot** to upsert today; refresh page to confirm persistence.

## Optional cleanup

Delete the smoke-test row from production if desired:

```sql
DELETE FROM daily_portfolio_snapshots
WHERE snapshot_date = '2099-01-15';
```
