import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatSgd,
  formatSignedSgd,
  formatUsd,
} from "@/lib/format/numbers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return formatUsd(value, 0);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatReturnPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatSGD(value: number, decimals = 0): string {
  return formatSgd(value, decimals);
}

export function formatSignedSGD(value: number, decimals = 0): string {
  return formatSignedSgd(value, decimals);
}

export function formatProgressPercent(value: number, decimals = 1): string {
  return `${Math.min(100, value).toFixed(decimals)}%`;
}
