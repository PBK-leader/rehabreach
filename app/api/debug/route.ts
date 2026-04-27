import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireInternalSecret } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const deny = requireInternalSecret(req);
  if (deny) return deny;
  const results: Record<string, string> = {};

  // Check env vars (just presence, not values)
  results.SUPABASE_URL = process.env.SUPABASE_URL ? "set" : "MISSING";
  results.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ? "set" : "MISSING";
  results.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
  results.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING";

  // Try Supabase connection
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from("patients").select("name").limit(1);
    if (error) {
      results.supabase_query = `ERROR: ${error.message}`;
    } else {
      results.supabase_query = `OK — ${data?.length ?? 0} rows`;
    }

    // Check call_logs.call_script column
    const { data: logSample, error: logError } = await supabase
      .from("call_logs")
      .select("id, status, call_script")
      .order("called_at", { ascending: false })
      .limit(1)
      .single();

    if (logError && logError.code !== "PGRST116") {
      results.call_logs_check = `ERROR: ${logError.message}`;
    } else if (!logSample) {
      results.call_logs_check = "no call logs yet";
    } else {
      results.call_logs_check = `last log id=${logSample.id} status=${logSample.status} has_script=${logSample.call_script !== null}`;
    }
  } catch (e: unknown) {
    results.supabase_query = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}
