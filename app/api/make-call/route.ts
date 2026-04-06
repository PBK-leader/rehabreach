import { NextRequest, NextResponse } from "next/server";
import { makeCall } from "@/lib/tools/makeCall";

export async function POST(req: NextRequest) {
  try {
    const { patient_id, call_slot, dry_run, retry_of } = await req.json();
    if (!patient_id || !call_slot) {
      return NextResponse.json({ error: "patient_id and call_slot are required" }, { status: 400 });
    }
    const result = await makeCall(patient_id, call_slot, dry_run ?? false, retry_of);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
