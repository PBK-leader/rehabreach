import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
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
  } catch (e: unknown) {
    results.supabase_query = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}
