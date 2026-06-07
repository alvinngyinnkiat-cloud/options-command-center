"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SOURCE_TYPE_LABELS } from "@/lib/market-intelligence/constants";
import type { IntelligenceSourceType } from "@/lib/market-intelligence/types";

interface DocumentUploadPanelProps {
  onUpload: (input: {
    title: string;
    sourceType: IntelligenceSourceType;
    rawText: string;
    fileName?: string;
  }) => void;
  isPending: boolean;
}

export function DocumentUploadPanel({
  onUpload,
  isPending,
}: DocumentUploadPanelProps) {
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] =
    useState<IntelligenceSourceType>("newsletter");
  const [rawText, setRawText] = useState("");

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRawText(text);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsText(file);
  }

  function handleSubmit() {
    onUpload({ title, sourceType, rawText, fileName: `${title}.txt` });
    setTitle("");
    setRawText("");
  }

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-elevated p-4 space-y-4">
      <h3 className="text-sm font-semibold text-terminal-text flex items-center gap-2">
        <Upload className="h-4 w-4 text-accent" />
        Upload Document
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-terminal-muted">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-terminal-border bg-terminal-sidebar px-3 py-2 text-sm"
            placeholder="Document title"
          />
        </div>
        <div>
          <label className="text-[11px] text-terminal-muted">Source Type</label>
          <select
            value={sourceType}
            onChange={(e) =>
              setSourceType(e.target.value as IntelligenceSourceType)
            }
            className="mt-1 w-full rounded-md border border-terminal-border bg-terminal-sidebar px-3 py-2 text-sm"
          >
            {Object.entries(SOURCE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-terminal-muted">Document Text</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-md border border-terminal-border bg-terminal-sidebar px-3 py-2 text-sm font-mono"
          placeholder="Paste newsletter, research, commentary, earnings notes, analyst notes, Reddit summary, or personal notes…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-terminal-border px-3 py-2 text-xs hover:bg-terminal-sidebar">
          Upload .txt / .csv
          <input
            type="file"
            accept=".txt,.csv,text/plain"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button
          variant="primary"
          size="sm"
          disabled={isPending || !title.trim() || !rawText.trim()}
          onClick={handleSubmit}
        >
          {isPending ? "Analyzing…" : "Upload & Analyze"}
        </Button>
      </div>
    </div>
  );
}
