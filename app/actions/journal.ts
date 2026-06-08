"use server";

import { journalRowFromForm } from "@/lib/journal/map-entry";
import type { JournalActionResult, JournalFormInput } from "@/lib/journal/types";
import {
  getJournalTrackerData,
  persistJournalEntry,
  removeJournalEntry,
} from "@/lib/supabase/queries/trading-journal";
import { requireUserId } from "@/lib/supabase/resolve-user";
import { revalidatePath } from "next/cache";

async function finish(): Promise<JournalActionResult> {
  const data = await getJournalTrackerData();
  revalidatePath("/journal");
  revalidatePath("/trades");
  return { success: true, data };
}

export async function createJournalEntry(
  input: JournalFormInput
): Promise<JournalActionResult> {
  try {
    const userId = await requireUserId();
    const row = journalRowFromForm(input, userId);
    await persistJournalEntry(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create journal entry.",
    };
  }
}

export async function updateJournalEntry(
  id: string,
  input: JournalFormInput,
  createdAt?: string
): Promise<JournalActionResult> {
  try {
    const userId = await requireUserId();
    const row = journalRowFromForm(input, userId, id, createdAt);
    await persistJournalEntry(row, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update journal entry.",
    };
  }
}

export async function deleteJournalEntry(
  id: string
): Promise<JournalActionResult> {
  try {
    const userId = await requireUserId();
    await removeJournalEntry(id, userId);
    return finish();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete journal entry.",
    };
  }
}
