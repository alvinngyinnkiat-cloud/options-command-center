"use client";

import { Button } from "@/components/ui/Button";
import { createDailyPortfolioSnapshot } from "@/app/actions/portfolio-snapshots";
import type { PortfolioHistoryData } from "@/lib/portfolio/daily-snapshot-types";
import { Camera } from "lucide-react";
import { useState } from "react";

interface CreateSnapshotButtonProps {
  onUpdated?: (history: PortfolioHistoryData) => void;
}

export function CreateSnapshotButton({ onUpdated }: CreateSnapshotButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const result = await createDailyPortfolioSnapshot();
    setBusy(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    onUpdated?.(result.history);
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} disabled={busy}>
      <Camera className="h-3.5 w-3.5" />
      {busy ? "Saving…" : "Create Snapshot"}
    </Button>
  );
}
