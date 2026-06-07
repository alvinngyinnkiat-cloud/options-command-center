"use server";

import type { AlertActionResult } from "@/lib/alerts/types";
import {
  getAlertsCenterData,
  persistAlertStatus,
} from "@/lib/supabase/queries/alerts-center";
import { revalidatePath } from "next/cache";

async function finish(): Promise<AlertActionResult> {
  const data = await getAlertsCenterData();
  revalidatePath("/alerts");
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/watchlist");
  return { success: true, data };
}

export async function dismissAlert(key: string): Promise<AlertActionResult> {
  try {
    await persistAlertStatus(key, "dismissed");
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to dismiss alert.",
    };
  }
}

export async function resolveAlert(key: string): Promise<AlertActionResult> {
  try {
    await persistAlertStatus(key, "resolved");
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to resolve alert.",
    };
  }
}

export async function reactivateAlert(key: string): Promise<AlertActionResult> {
  try {
    await persistAlertStatus(key, "active");
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reactivate alert.",
    };
  }
}
