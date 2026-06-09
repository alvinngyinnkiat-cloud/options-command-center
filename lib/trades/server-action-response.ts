/** Plain JSON-safe payload for Next.js server action responses. */
export function serializeServerActionPayload<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (v === undefined) return null;
      if (typeof v === "number" && !Number.isFinite(v)) return null;
      return v;
    })
  ) as T;
}

export function formatActionError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (message) return message;
    return error.name ? `${error.name}: save failed.` : "Save failed.";
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "Failed to update current option value.";
}

export function formatSupabaseError(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}): string {
  const parts = [error.message, error.details, error.hint]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" — ");
  return `Failed to save trade (${error.code ?? "unknown"}).`;
}
