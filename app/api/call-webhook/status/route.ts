import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

// Twilio calls this when a call ends. We update the log status and
// trigger retry_call.py if the patient didn't answer.

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const log_id = searchParams.get("log_id");

  if (!log_id) return NextResponse.json({ ok: true });

  const formData = await req.formData();
  const callStatus = (formData.get("CallStatus") as string) ?? "";
  const answeredBy = (formData.get("AnsweredBy") as string) ?? "";

  const supabase = createServerClient();

  try {
    // Map Twilio status to our schema
    let status: string;
    if (callStatus === "completed") {
      status = "completed";
    } else if (callStatus === "no-answer" || callStatus === "busy" || answeredBy === "machine_start") {
      status = "no_answer";
    } else {
      status = "missed";
    }

    await supabase.from("call_logs").update({ status }).eq("id", log_id);

    // Trigger retry if no-answer
    if (status === "no_answer") {
      const scriptPath = path.join(process.cwd(), "tools", "retry_call.py");
      // Run in background — don't await
      execFileAsync("python", [scriptPath, "--log_id", log_id]).catch((e) =>
        console.error("retry_call error:", e)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("status callback error:", e);
    return NextResponse.json({ ok: true }); // Always 200 to Twilio
  }
}
