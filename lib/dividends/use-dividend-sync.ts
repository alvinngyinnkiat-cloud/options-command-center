"use client";

import { useCallback, useEffect } from "react";
import { refreshDividendDependentData } from "@/app/actions/dividend-records";
import { DIVIDEND_DATA_UPDATED_EVENT } from "./sync-events";

export type DividendDependentRefreshData = Awaited<
  ReturnType<typeof refreshDividendDependentData>
>;

export function useDividendDataSync(
  onRefresh: (data: DividendDependentRefreshData) => void
) {
  const handleRefresh = useCallback(async () => {
    const data = await refreshDividendDependentData();
    onRefresh(data);
  }, [onRefresh]);

  useEffect(() => {
    const listener = () => {
      void handleRefresh();
    };
    window.addEventListener(DIVIDEND_DATA_UPDATED_EVENT, listener);
    return () => window.removeEventListener(DIVIDEND_DATA_UPDATED_EVENT, listener);
  }, [handleRefresh]);
}
