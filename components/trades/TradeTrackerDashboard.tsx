import { getAlertsCenterData } from "@/lib/supabase/queries/alerts-center";
import { getClientProfilesForSelect } from "@/lib/supabase/queries/client-profit-sharing";
import { getOptionsTradesData } from "@/lib/supabase/queries/options-trades";
import { mapClientProfile } from "@/lib/client-profit-sharing/map-client";
import { TradeTrackerClient } from "./TradeTrackerClient";

export async function TradeTrackerDashboard() {
  const [data, alertsData, clientRows] = await Promise.all([
    getOptionsTradesData(),
    getAlertsCenterData(),
    getClientProfilesForSelect(),
  ]);
  return (
    <TradeTrackerClient
      initialData={data}
      alerts={alertsData.alerts}
      clients={clientRows.map(mapClientProfile)}
    />
  );
}
