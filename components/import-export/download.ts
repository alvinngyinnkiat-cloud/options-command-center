import type { FileDownloadPayload } from "@/lib/import-export/types";

export function triggerFileDownload(payload: FileDownloadPayload): void {
  const bytes = Uint8Array.from(atob(payload.base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
