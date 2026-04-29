import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/tools/generateScript";
import { requireInternalSecret } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const deny = requireInternalSecret(req);
  if (deny) return deny;
  try {
    const { patient_id, call_slot } = await req.json();
    if (!patient_id || !call_slot) {
      return NextResponse.json({ error: "patient_id and call_slot are required" }, { status: 400 });
    }
    const script = await generateScript(patient_id, call_slot);
    return NextResponse.json(script);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
