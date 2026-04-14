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
  const negative = searchParams.get("negative") === "1";

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
      return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${greetingSay}<Gather input="speech" language="${sttLang}" timeout="10" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">${firstQuestion}<Pause length="2"/></Gather><Redirect method="POST">${escapeXml(webhookUrl)}</Redirect></Response>`);
    }

    const prevExchange = exchanges[exchange_index - 1];
    const neutralEchoEN = "I understand. Thank you for letting me know. I have noted that.";
    const neutralEchoHI = "Samajh gaya. Dhanyavaad batane ke liye. Maine note kar liya hai.";
    const echoText = negative
      ? (language === "hi" ? neutralEchoHI : neutralEchoEN)
      : (prevExchange.confirmation_echo as string);
    const echoSay = buildSay(echoText, language);

    if (exchange_index >= exchanges.length) {
      const closingSay = buildSay(script.closing as string, language);
      await supabase.from("call_logs").update({ status: "completed" }).eq("id", log_id);
      return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${echoSay}${closingSay}<Hangup/></Response>`);
    }

    const nextQuestion = buildSay(exchanges[exchange_index].question as string, language);
    const gatherUrl = `${appUrl}/api/call-webhook/gather?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index}`;
    const webhookUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index}`;
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${echoSay}<Gather input="speech" language="${sttLang}" timeout="10" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">${nextQuestion}<Pause length="2"/></Gather><Redirect method="POST">${escapeXml(webhookUrl)}</Redirect></Response>`);

  } catch (e) {
    console.error("call-webhook error:", e);
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, there was an error. Goodbye.</Say><Hangup/></Response>`);
  }
}
