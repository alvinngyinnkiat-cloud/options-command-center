"use client";

import Link from "next/link";
import { Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./SidebarNav";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-terminal-border bg-terminal-sidebar",
          "w-72 transition-transform duration-200 ease-in-out",
          "lg:static lg:w-80 lg:shrink-0 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-terminal-border px-5">
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            <div className="flex h-9 w-9 items-center justify-center rounded bg-accent/20 border border-accent/30">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-terminal-text leading-tight">
                Investment Manager
              </span>
              <span className="text-[10px] text-terminal-muted leading-tight">
                Portfolio & Trading Dashboard
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-terminal-muted hover:bg-terminal-elevated hover:text-terminal-text lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav onClose={onClose} />

        <div className="border-t border-terminal-border p-4">
          <div className="rounded-md bg-terminal-elevated border border-terminal-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
              Phases 1–14 Complete
            </p>
            <p className="text-sm text-terminal-text mt-0.5">16-Module Platform</p>
            <p className="text-[11px] text-terminal-muted mt-1">
              Next: Phase 15 Weekend Workflow
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
