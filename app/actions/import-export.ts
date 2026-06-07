"use server";

import { applyImportRows } from "@/lib/import-export/import-apply";
import { exportCsvEntity } from "@/lib/import-export/csv-export";
import { exportExcelWorkbook } from "@/lib/import-export/excel-export";
import { exportPdfReport } from "@/lib/import-export/pdf-export";
import {
  exportFullBackupJson,
  previewCsvImport,
  restoreFullBackupJson,
} from "@/lib/import-export/backup";
import { getImportExportPageData } from "@/lib/import-export/data-bundle";
import type {
  CsvExportEntity,
  FileDownloadPayload,
  ImportEntityType,
  ImportPreviewRow,
  ImportSummary,
  PdfReportType,
} from "@/lib/import-export/types";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATHS = [
  "/import-export",
  "/",
  "/trades",
  "/watchlist",
  "/crypto",
  "/stocks",
  "/journal",
  "/risk",
  "/goals",
  "/weekend-review",
];

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function fetchImportExportPageData() {
  return getImportExportPageData();
}

export async function previewImportCsv(
  entityType: ImportEntityType,
  csvText: string
) {
  return previewCsvImport(entityType, csvText);
}

export async function confirmImport(
  entityType: ImportEntityType,
  rows: ImportPreviewRow[],
  skipDuplicates = true
): Promise<ImportSummary> {
  const summary = await applyImportRows(entityType, rows, skipDuplicates);
  revalidateAll();
  return summary;
}

export async function downloadCsvExport(
  entity: CsvExportEntity
): Promise<FileDownloadPayload> {
  return exportCsvEntity(entity);
}

export async function downloadExcelExport(): Promise<FileDownloadPayload> {
  return exportExcelWorkbook();
}

export async function downloadPdfReport(
  reportType: PdfReportType
): Promise<FileDownloadPayload> {
  return exportPdfReport(reportType);
}

export async function downloadFullBackup(): Promise<FileDownloadPayload> {
  return exportFullBackupJson();
}

export async function restoreFullBackup(jsonText: string) {
  const result = await restoreFullBackupJson(jsonText);
  if (result.success) revalidateAll();
  return result;
}
