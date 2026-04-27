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

const NEGATION_EN = ["no ", "not ", "don't have ", "do not have ", "without ", "didn't ", "did not ", "none ", "never "];
const NEGATION_HI = ["nahi ", "nahin ", "koi nahi", "nahi hai", "bilkul nahi"];

function detectUrgent(text: string, language: string): boolean {
  const lower = text.toLowerCase();
  const keywords = language === "hi" ? URGENT_KEYWORDS_HI : URGENT_KEYWORDS_EN;
  const negations = language === "hi" ? NEGATION_HI : NEGATION_EN;
  return keywords.some((kw) => {
    const idx = lower.indexOf(kw);
    if (idx === -1) return false;
    const before = lower.slice(Math.max(0, idx - 30), idx);
    return !negations.some((neg) => before.includes(neg));
  });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function say(text: string, lang: string, voice: string): string {
  const cleaned = text.replace(/\[pause\]/gi, " ").replace(/\s+/g, " ").trim();
  return `<Say language="${lang}" voice="${voice}"><prosody rate="medium">${escapeXml(cleaned)}</prosody></Say>`;
}

function twiml(xml: string) {
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

function buildGather(
  questionText: string, hints: string[], lang: string, voice: string, sttLang: string,
  gatherUrl: string, fallbackUrl: string
): string {
  const hintAttr = hints.length ? ` hints="${escapeXml(hints.join(","))}"` : "";
  return `<Gather input="speech" language="${sttLang}" timeout="8" speechTimeout="2" enhanced="true"${hintAttr} action="${escapeXml(gatherUrl)}" method="POST">${say(questionText, lang, voice)}</Gather><Redirect method="POST">${escapeXml(fallbackUrl)}</Redirect>`;
}

const CONFIDENCE_THRESHOLD = 0.35;

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get("patient_id")!;
  const call_slot = searchParams.get("call_slot")!;
  const log_id = searchParams.get("log_id")!;
  const exchange_index = parseInt(searchParams.get("exchange") ?? "0");
  const retry = searchParams.get("retry") === "1";

  const formData = await req.formData();
  const speechResult = ((formData.get("SpeechResult") as string) ?? "").trim();
  const confidence = parseFloat((formData.get("Confidence") as string) ?? "1");

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
    const exchange = exchanges[exchange_index];
    const lang = language === "hi" ? "hi-IN" : "en-US";
    const voice = language === "hi" ? "Polly.Aditi" : "Polly.Joanna";
    const sttLang = language === "hi" ? "hi-IN" : "en-US";

    // Re-ask only if NO speech was captured at all (not on low confidence — short answers like "5" or "seven" score low)
    if (!retry && speechResult.length === 0) {
      if (exchange?.question) {
        const retryMsg = language === "hi"
          ? "Maafi kijiye, mujhe samajh nahi aaya. Kripaya dobara bataiye."
          : "Sorry, I did not catch that. Could you please repeat that?";
        const hints = (exchange.hints as string[] | undefined) ?? [];
        const gatherUrl = `${appUrl}/api/call-webhook/gather?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index}&retry=1`;
        const fallbackUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index + 1}`;
        return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${say(retryMsg, lang, voice)}${buildGather(exchange.question as string, hints, lang, voice, sttLang, gatherUrl, fallbackUrl)}</Response>`);
      }
    }

    // Save transcript entry and fire alert in parallel — don't wait for either before responding
    const exchangeLabel = (exchange?.task_name as string) ?? `exchange_${exchange_index}`;
    const confidenceNote = confidence < CONFIDENCE_THRESHOLD ? ` [low confidence: ${confidence.toFixed(2)}]` : confidence < 0.80 ? ` [conf: ${confidence.toFixed(2)}]` : "";
    const existing = (log?.transcript as string) ?? "";
    const newTranscript = `${existing}\n[${exchangeLabel}] Patient: ${speechResult || "(no response)"}${confidenceNote}`.trim();

    const isUrgent = detectUrgent(speechResult, language);

    // Fire DB write + alert in background — don't await so TwiML is returned immediately
    void Promise.resolve(supabase.from("call_logs").update({ transcript: newTranscript }).eq("id", log_id))
      .catch((e) => console.error("transcript update error:", e));
    if (isUrgent && exchange?.urgent_response) {
      fetch(`${appUrl}/api/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.INTERNAL_API_SECRET ?? ""}` },
        body: JSON.stringify({ patient_id, reason: "cardiac_symptom", log_id }),
      }).catch((e) => console.error("alert fetch error:", e));
    }

    // Build next step directly — no redirect round-trip
    const nextIndex = exchange_index + 1;
    const echoText = (exchange?.confirmation_echo as string) ?? "";

    // Urgent: say acknowledgement then continue
    const prefixSay = isUrgent && exchange?.urgent_response
      ? say(exchange.urgent_response as string, lang, voice)
      : echoText ? say(echoText, lang, voice) : "";

    if (nextIndex >= exchanges.length) {
      // All questions done — play closing and hang up
      const closingSay = say(script.closing as string, lang, voice);
      void Promise.resolve(supabase.from("call_logs").update({ status: "completed" }).eq("id", log_id))
        .catch((e) => console.error("status update error:", e));
      return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${prefixSay}${closingSay}<Hangup/></Response>`);
    }

    // Ask next question immediately
    const nextExchange = exchanges[nextIndex];
    const nextHints = (nextExchange?.hints as string[] | undefined) ?? [];
    const gatherUrl = `${appUrl}/api/call-webhook/gather?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${nextIndex}`;
    const fallbackUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${nextIndex}`;
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${prefixSay}${buildGather(nextExchange.question as string, nextHints, lang, voice, sttLang, gatherUrl, fallbackUrl)}</Response>`);

  } catch (e) {
    console.error("gather error:", e);
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you. Goodbye.</Say><Hangup/></Response>`);
  }
}
