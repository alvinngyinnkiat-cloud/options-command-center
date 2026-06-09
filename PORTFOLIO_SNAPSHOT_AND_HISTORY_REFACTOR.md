# Portfolio Snapshot & History Refactor

## Objective

Move all snapshot **creation** to the Portfolio Dashboard. Financial Goals displays **historical performance and milestones only** — no snapshot controls.

## What was removed from Financial Goals

- Daily Portfolio Value Tracker card
- Portfolio History table (add/edit/delete records)
- Create Snapshot button
- All duplicate snapshot widgets

**Financial Goals now contains:**

- Portfolio Value Over Time chart (`my_portfolio_value_sgd` / `portfolio_value_sgd`)
- Milestone Tracker (highest, lowest, current, average + achievements)
- Financial Goals panels (settings, breakdown, contributions, projections)

## Snapshot creation — Portfolio Dashboard only

New section: **Daily Portfolio Snapshot** (`components/portfolio/PortfolioSnapshotSection.tsx`)

- **Create Snapshot** button (`components/portfolio/CreateSnapshotButton.tsx`)
- Shows latest recorded snapshot summary (date, my portfolio, client portfolio, total AUM)

### Stored values (ownership split)

| Field | DB column | Source |
|-------|-----------|--------|
| Snapshot date | `snapshot_date` | Today (Singapore, `Asia/Singapore`) |
| My Portfolio Value | `portfolio_value_sgd` | Total Portfolio − Client Portfolio |
| Client Portfolio | `client_current_value_sgd` | Manual Client Portfolio (SGD) |
| Total Assets Managed | `total_assets_managed_sgd` (generated) | Total Portfolio |

## Snapshot rules

1. **One snapshot per day** — upsert on `(user_id, snapshot_date)`; no duplicates.
2. **Today only** — `upsertDailyPortfolioSnapshot` rejects dates other than Singapore today.
3. **Frozen history** — past rows are never modified by portfolio override saves or page loads.
4. **No auto-create on load** — removed `ensureDailyPortfolioSnapshot` from `getPortfolioHistoryData`.
5. **No side-effect snapshots** — removed automatic upsert from `savePortfolioOverride`.

## Real snapshot filtering

`filterRealPortfolioSnapshots()` excludes:

- `2099-01-15` (smoke-test date)
- `mock-daily-*` IDs (generated mock history)
- Future dates (> Singapore today)

Applied in `buildHistoryData` before chart, milestones, and comparisons.

Mock/fallback history is generated **only** when Supabase is not configured.

## Milestone Tracker

Uses filtered real snapshots only:

- **Highest / Lowest** — min/max `portfolio_value_sgd` across real snapshots
- **Current** — latest real snapshot on or before today
- **Average** — mean of real snapshots
- Single snapshot: highest = lowest = current

## Client Portfolio helper (Portfolio Dashboard)

Under **Client Portfolio** card:

- **Client Current Value (USD)** — read-only, from Client Profit Sharing Tracker (`pools.clientCurrentValue`)
- Reference for manual SGD conversion before saving Client Portfolio

## Files changed

| Action | Path |
|--------|------|
| Added | `components/portfolio/PortfolioSnapshotSection.tsx` |
| Updated | `components/portfolio/PortfolioDashboardClient.tsx` |
| Updated | `components/portfolio/PortfolioDashboard.tsx` |
| Updated | `components/portfolio/CreateSnapshotButton.tsx` |
| Updated | `components/portfolio/PortfolioOwnershipSplitSection.tsx` |
| Updated | `components/goals/PortfolioGrowthHistorySection.tsx` |
| Updated | `lib/portfolio/snapshot-date.ts` (Singapore timezone) |
| Updated | `lib/portfolio/snapshot-history.ts` (real snapshot filter, milestones) |
| Updated | `lib/supabase/queries/daily-portfolio-snapshots.ts` |
| Updated | `app/actions/portfolio-snapshots.ts` |
| Updated | `app/actions/portfolio.ts` (removed auto-snapshot on override save) |
| Deleted | `components/goals/DailyPortfolioTrackerCard.tsx` |
| Deleted | `components/goals/PortfolioHistoryTable.tsx` |
| Deleted | `components/goals/PortfolioHistoryFormModal.tsx` |
| Deleted | `components/portfolio/PortfolioHistoryPanel.tsx` |

## Verification checklist

1. Open **Portfolio Dashboard** → click **Create Snapshot**
2. Refresh — snapshot persists with today's Singapore date
3. Click again same day — row updates, count unchanged
4. Open **Financial Goals** — chart and milestones reflect new snapshot
5. Change manual breakdown — past snapshots unchanged
6. Highest / Lowest / Current / Average update after new real snapshot

## Build

```bash
npx vitest run lib/portfolio/snapshot-history.test.ts lib/portfolio/daily-snapshot.test.ts
npm run build
```

Both pass.
