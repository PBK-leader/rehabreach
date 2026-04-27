import { NextRequest, NextResponse } from "next/server";
import { sendAlert } from "@/lib/tools/sendAlert";
import { requireInternalSecret } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const deny = requireInternalSecret(req);
  if (deny) return deny;
  try {
    const { patient_id, reason, log_id, dry_run } = await req.json();
    if (!patient_id || !reason) {
      return NextResponse.json({ error: "patient_id and reason are required" }, { status: 400 });
    }
    const result = await sendAlert(patient_id, reason, log_id, dry_run ?? false);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
