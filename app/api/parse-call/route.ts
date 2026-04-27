import { NextRequest, NextResponse } from "next/server";
import { parseCall } from "@/lib/tools/parseCall";
import { requireInternalSecret } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const deny = requireInternalSecret(req);
  if (deny) return deny;
  try {
    const { log_id, dry_run } = await req.json();
    if (!log_id) {
      return NextResponse.json({ error: "log_id is required" }, { status: 400 });
    }
    const result = await parseCall(log_id, dry_run ?? false);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
