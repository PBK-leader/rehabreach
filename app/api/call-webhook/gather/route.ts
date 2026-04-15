import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const URGENT_KEYWORDS_EN = [
  "chest pain", "chest pressure", "chest tightness", "can't breathe",
  "cannot breathe", "shortness of breath", "short of breath",
  "dizzy", "fainted", "fell down", "collapsed",
];
const URGENT_KEYWORDS_HI = [
  "seene mein dard", "sans nahi", "saans nahi", "chakkar", "behosh", "gir gaya", "gir gayi",
];

function detectUrgent(text: string, language: string): boolean {
  const lower = text.toLowerCase();
  const keywords = language === "hi" ? URGENT_KEYWORDS_HI : URGENT_KEYWORDS_EN;
  return keywords.some((kw) => lower.includes(kw));
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function twiml(xml: string) {
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get("patient_id")!;
  const call_slot = searchParams.get("call_slot")!;
  const log_id = searchParams.get("log_id")!;
  const exchange_index = parseInt(searchParams.get("exchange") ?? "0");

  const formData = await req.formData();
  const speechResult = (formData.get("SpeechResult") as string) ?? "";

  try {
    const supabase = createServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { data: log } = await supabase
      .from("call_logs")
      .select("call_script, transcript, language")
      .eq("id", log_id)
      .single();

    const script = log?.call_script as Record<string, unknown>;
    const language = (script?.language as string) ?? "en";
    const exchanges = (script?.exchanges as Record<string, unknown>[]) ?? [];

    // Append speech to transcript
    const exchangeLabel = (exchanges[exchange_index]?.task_name as string) ?? `exchange_${exchange_index}`;
    const existing = (log?.transcript as string) ?? "";
    const newTranscript = `${existing}\n[${exchangeLabel}] Patient: ${speechResult}`.trim();
    await supabase.from("call_logs").update({ transcript: newTranscript }).eq("id", log_id);

    // Check for urgent symptom
    const isUrgent = detectUrgent(speechResult, language);
    const exchange = exchanges[exchange_index];

    if (isUrgent && exchange?.urgent_response) {
      const lang = language === "hi" ? "hi-IN" : "en-US";
      const voice = language === "hi" ? "Polly.Aditi" : "Polly.Joanna";

      await fetch(`${appUrl}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id, reason: "cardiac_symptom", log_id }),
      });

      const urgentText = (exchange.urgent_response as string).replace(/\[pause\]/gi, " ").replace(/\s+/g, " ").trim();
      return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${lang}" voice="${voice}"><prosody rate="medium">${escapeXml(urgentText)}</prosody></Say>
  <Hangup/>
</Response>`);
    }

    // Advance to next exchange — always use the script's confirmation_echo.
    // Interpretation (positive/negative/alert) is handled by parseCall after the call ends.
    const nextIndex = exchange_index + 1;
    const nextUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${nextIndex}`;
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${escapeXml(nextUrl)}</Redirect></Response>`);

  } catch (e) {
    console.error("gather error:", e);
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you. Goodbye.</Say><Hangup/></Response>`);
  }
}
