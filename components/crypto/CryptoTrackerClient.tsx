"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { splitOpenClosedHoldings } from "@/lib/crypto/allocation";
import type { CryptoTrackerData, EnrichedCryptoHolding } from "@/lib/crypto/types";
import { Banknote, Coins, PlusCircle, ShoppingCart } from "lucide-react";
import { CryptoHoldingsTable } from "./CryptoHoldingsTable";
import { CryptoManualAdjustmentModal } from "./CryptoManualAdjustmentModal";
import { CryptoManualPortfolioCard } from "./CryptoManualPortfolioCard";
import { CryptoSummaryCards } from "./CryptoSummaryCards";
import { CryptoAllocationChart } from "./CryptoAllocationChart";
import { CryptoHoldingsByTier } from "./CryptoHoldingsByTier";
import { CryptoDeploymentPlanner } from "./CryptoDeploymentPlanner";
import {
  CryptoTransactionModals,
  type ModalKind,
} from "./CryptoTransactionModals";
import { CryptoTransactionHistoryTable } from "./CryptoTransactionHistoryTable";

interface CryptoTrackerClientProps {
  initialData: CryptoTrackerData;
}

export function CryptoTrackerClient({ initialData }: CryptoTrackerClientProps) {
  const [txModal, setTxModal] = useState<ModalKind | null>(null);
  const [sellHolding, setSellHolding] = useState<EnrichedCryptoHolding | null>(
    null
  );
  const [adjustHolding, setAdjustHolding] =
    useState<EnrichedCryptoHolding | null>(null);

  const { open, closed } = useMemo(
    () => splitOpenClosedHoldings(initialData.holdings),
    [initialData.holdings]
  );

  function handleRefresh() {
    window.location.reload();
  }

  function openSell(h: EnrichedCryptoHolding) {
    setSellHolding(h);
    setTxModal("sell");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crypto Trade Tracker"
        description="Transaction-based crypto portfolio — deposits, buys, sells, and manual corrections."
        actions={
          <>
            <Badge variant="outline">V2 Transactions</Badge>
            {initialData.dataSource === "supabase" && (
              <Badge variant="success">Saved</Badge>
            )}
          </>
        }
      />

      <CryptoSummaryCards portfolioManual={initialData.portfolioManual} />

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => setTxModal("deposit")}>
          <Banknote className="h-4 w-4" />
          Deposit Cash
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTxModal("monthly_contribution")}
        >
          <PlusCircle className="h-4 w-4" />
          Monthly Contribution
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setTxModal("buy")}>
          <ShoppingCart className="h-4 w-4" />
          Buy Coin
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setTxModal("fee")}>
          <Coins className="h-4 w-4" />
          Record Fee
        </Button>
      </div>

      <CryptoManualPortfolioCard
        portfolioManual={initialData.portfolioManual}
        onSaved={handleRefresh}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CryptoAllocationChart slices={initialData.allocationSlices} />
        <CryptoDeploymentPlanner
          cryptoCashSgd={initialData.portfolioManual.cryptoCashSgd}
          plan={initialData.deploymentPlan}
        />
      </div>

      <CryptoHoldingsByTier tierGroups={initialData.tierGroups} />

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Open Positions
        </h2>
        <CryptoHoldingsTable
          holdings={open}
          variant="open"
          onAdjust={(h) => setAdjustHolding(h)}
          onSell={openSell}
          onRefresh={handleRefresh}
          emptyMessage="No crypto positions recorded yet."
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Closed Positions
        </h2>
        <CryptoHoldingsTable
          holdings={closed}
          variant="closed"
          onRestore={(h) => setAdjustHolding(h)}
          onRefresh={handleRefresh}
          emptyMessage="No closed crypto positions."
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-terminal-muted">
          Transaction History
        </h2>
        <CryptoTransactionHistoryTable
          transactions={initialData.transactions}
          onRefresh={handleRefresh}
        />
      </section>

      <CryptoTransactionModals
        kind={txModal}
        holding={sellHolding}
        availableCashSgd={initialData.portfolioManual.cryptoCashSgd}
        onClose={() => {
          setTxModal(null);
          setSellHolding(null);
        }}
        onSaved={handleRefresh}
      />

      {adjustHolding && (
        <CryptoManualAdjustmentModal
          holding={adjustHolding}
          onClose={() => setAdjustHolding(null)}
          onSaved={handleRefresh}
        />
      )}

      <p className="text-[11px] text-terminal-muted">
        Current Value = open position values only. Portfolio Value = Current Value
        + Available Exchange Cash. Deployment Planner uses exchange cash only
        (50/25/15/10). Set Current Value &gt; 0 to restore a closed position.
      </p>
    </div>
  );
}
