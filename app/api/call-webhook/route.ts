import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

function twiml(xml: string) {
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSay(text: string, language: string): string {
  const lang = language === "hi" ? "hi-IN" : "en-US";
  const voice = language === "hi" ? "Polly.Aditi" : "Polly.Joanna";
  // Strip [pause] tags — rely on natural speech rhythm instead
  const cleaned = text.replace(/\[pause\]/gi, " ").replace(/\s+/g, " ").trim();
  return `<Say language="${lang}" voice="${voice}"><prosody rate="medium">${escapeXml(cleaned)}</prosody></Say>`;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get("patient_id");
  const call_slot = searchParams.get("call_slot");
  const log_id = searchParams.get("log_id");
  const exchange_index = parseInt(searchParams.get("exchange") ?? "0");

  if (!patient_id || !call_slot || !log_id) {
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was a configuration error. Goodbye.</Say><Hangup/></Response>`);
  }

  try {
    const supabase = createServerClient();
    const { data: log, error: logError } = await supabase
      .from("call_logs")
      .select("call_script, language")
      .eq("id", log_id)
      .single();

    if (logError || !log?.call_script) {
      console.error("call-webhook: no script found for log_id", log_id, logError?.message);
      return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, I could not load your call details. Goodbye.</Say><Hangup/></Response>`);
    }

    const script = log.call_script as Record<string, unknown>;
    const language = (script.language as string) ?? (log.language as string) ?? "en";
    const exchanges = (script.exchanges as Record<string, unknown>[]) ?? [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const sttLang = language === "hi" ? "hi-IN" : "en-US";

    function gatherAttrs(exchangeIdx: number): string {
      const hints = (exchanges[exchangeIdx]?.hints as string[] | undefined) ?? [];
      const hintAttr = hints.length ? ` hints="${escapeXml(hints.join(","))}"` : "";
      return `input="speech" language="${sttLang}" timeout="10" speechTimeout="3" enhanced="true"${hintAttr}`;
    }

    if (exchange_index === 0) {
      const greetingSay = buildSay(script.greeting as string, language);
      if (exchanges.length === 0) {
        const closingSay = buildSay(script.closing as string, language);
        await supabase.from("call_logs").update({ status: "completed" }).eq("id", log_id);
        return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${greetingSay}${closingSay}<Hangup/></Response>`);
      }
      const firstQuestion = buildSay(exchanges[0].question as string, language);
      const gatherUrl = `${appUrl}/api/call-webhook/gather?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=0`;
      const webhookUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=0`;
      return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${greetingSay}<Gather ${gatherAttrs(0)} action="${escapeXml(gatherUrl)}" method="POST">${firstQuestion}<Pause length="2"/></Gather><Redirect method="POST">${escapeXml(webhookUrl)}</Redirect></Response>`);
    }

    const prevExchange = exchanges[exchange_index - 1];
    const echoSay = buildSay(prevExchange.confirmation_echo as string, language);

    if (exchange_index >= exchanges.length) {
      const closingSay = buildSay(script.closing as string, language);
      await supabase.from("call_logs").update({ status: "completed" }).eq("id", log_id);
      return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${echoSay}${closingSay}<Hangup/></Response>`);
    }

    const nextQuestion = buildSay(exchanges[exchange_index].question as string, language);
    const gatherUrl = `${appUrl}/api/call-webhook/gather?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index}`;
    // Fallback advances to next exchange so a timeout never loops the same question
    const webhookUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index + 1}`;
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${echoSay}<Gather ${gatherAttrs(exchange_index)} action="${escapeXml(gatherUrl)}" method="POST">${nextQuestion}<Pause length="2"/></Gather><Redirect method="POST">${escapeXml(webhookUrl)}</Redirect></Response>`);

  } catch (e) {
    console.error("call-webhook error:", e);
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error. Goodbye.</Say><Hangup/></Response>`);
  }
}
