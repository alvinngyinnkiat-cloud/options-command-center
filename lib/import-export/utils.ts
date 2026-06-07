import type { FileDownloadPayload } from "./types";

export function toBase64(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Buffer.from(bytes).toString("base64");
}

export function buildTextDownload(
  filename: string,
  mimeType: string,
  content: string
): FileDownloadPayload {
  const encoder = new TextEncoder();
  return {
    filename,
    mimeType,
    base64: toBase64(encoder.encode(content)),
  };
}

export function buildBinaryDownload(
  filename: string,
  mimeType: string,
  data: Uint8Array | ArrayBuffer
): FileDownloadPayload {
  return { filename, mimeType, base64: toBase64(data) };
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const cleaned = value.replace(/[$,%\s]/g, "").replace(/,/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

export function todayStamp(): string {
  return new Date().toISOString().split("T")[0];
}

export function timestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
