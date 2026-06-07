import { getImportExportPageData } from "@/lib/import-export/data-bundle";
import { ImportExportClient } from "./ImportExportClient";

export async function ImportExportDashboard() {
  const data = await getImportExportPageData();
  return <ImportExportClient initialData={data} />;
}
