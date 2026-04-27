"use server";

import { makeCall } from "@/lib/tools/makeCall";

export async function placeCall(patientId: string, callSlot: string): Promise<{ ok: true; callSid: string } | { ok: false; error: string }> {
  try {
    const result = await makeCall(patientId, callSlot, false) as { call_sid: string };
    return { ok: true, callSid: result.call_sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Call failed" };
  }
}
