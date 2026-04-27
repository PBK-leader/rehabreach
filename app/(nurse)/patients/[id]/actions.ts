"use server";

import { makeCall } from "@/lib/tools/makeCall";
import { parseCall } from "@/lib/tools/parseCall";
import { revalidatePath } from "next/cache";

export async function placeCall(patientId: string, callSlot: string): Promise<{ ok: true; callSid: string } | { ok: false; error: string }> {
  try {
    const result = await makeCall(patientId, callSlot, false) as { call_sid: string };
    return { ok: true, callSid: result.call_sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Call failed" };
  }
}

export async function reparseLog(logId: string, patientId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await parseCall(logId);
    revalidatePath(`/patients/${patientId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Parse failed" };
  }
}
