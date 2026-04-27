import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { parseCall } from "@/lib/tools/parseCall";
import { makeCall } from "@/lib/tools/makeCall";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const log_id = searchParams.get("log_id");

  if (!log_id) return NextResponse.json({ ok: true });

  const formData = await req.formData();
  const callStatus = (formData.get("CallStatus") as string) ?? "";
  const answeredBy = (formData.get("AnsweredBy") as string) ?? "";

  const supabase = createServerClient();

  try {
    let status: string;
    if (callStatus === "completed") {
      status = "completed";
    } else if (callStatus === "no-answer" || callStatus === "busy" || answeredBy === "machine_start") {
      status = "no_answer";
    } else {
      status = "missed";
    }

    await supabase.from("call_logs").update({ status }).eq("id", log_id);

    if (status === "completed") {
      const { data: log } = await supabase
        .from("call_logs")
        .select("transcript")
        .eq("id", log_id)
        .single();

      if (log?.transcript) {
        await parseCall(log_id).catch((e) => console.error("auto-parse error:", e));
      }
    }

    if (status === "no_answer") {
      const { data: log } = await supabase
        .from("call_logs")
        .select("retry_of, patient_id, call_type")
        .eq("id", log_id)
        .single();

      if (log && !log.retry_of) {
        setTimeout(() => {
          makeCall(log.patient_id, log.call_type ?? "morning", false, log_id)
            .catch((e) => console.error("retry call error:", e));
        }, 30 * 60 * 1000);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("status callback error:", e);
    return NextResponse.json({ ok: true });
  }
}
