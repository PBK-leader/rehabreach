import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireTwilioSignature } from "@/lib/apiAuth";

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
    // Check if any negation word appears in the 30 characters before the keyword
    const before = lower.slice(Math.max(0, idx - 30), idx);
    return !negations.some((neg) => before.includes(neg));
  });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function twiml(xml: string) {
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

// Minimum confidence to accept a response without re-asking
const CONFIDENCE_THRESHOLD = 0.55;

export async function POST(req: NextRequest) {
  const deny = await requireTwilioSignature(req);
  if (deny) return deny;

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

    // Re-ask once if: no speech captured OR confidence below threshold (and not already a retry)
    if (!retry && (speechResult.length === 0 || confidence < CONFIDENCE_THRESHOLD)) {
      if (!exchange?.question) {
        // No question to re-ask — just move on
      } else {
        const question = (exchange.question as string).replace(/\[pause\]/gi, " ").replace(/\s+/g, " ").trim();
        const retryMsg = language === "hi"
          ? "Maafi kijiye, mujhe samajh nahi aaya. Kripaya dobara bataiye."
          : "Sorry, I did not catch that. Could you say that again?";
        const hints = (exchange.hints as string[] | undefined) ?? [];
        const hintAttr = hints.length ? ` hints="${escapeXml(hints.join(","))}"` : "";
        const gatherUrl = `${appUrl}/api/call-webhook/gather?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index}&retry=1`;
        const webhookUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${exchange_index}`;
        return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${lang}" voice="${voice}"><prosody rate="medium">${escapeXml(retryMsg)}</prosody></Say>
  <Gather input="speech" language="${sttLang}" timeout="10" speechTimeout="3" enhanced="true"${hintAttr} action="${escapeXml(gatherUrl)}" method="POST">
    <Say language="${lang}" voice="${voice}"><prosody rate="medium">${escapeXml(question)}</prosody></Say>
    <Pause length="2"/>
  </Gather>
  <Redirect method="POST">${escapeXml(webhookUrl)}</Redirect>
</Response>`);
      }
    }

    // Append to transcript with confidence score
    const exchangeLabel = (exchange?.task_name as string) ?? `exchange_${exchange_index}`;
    const confidenceNote = confidence < CONFIDENCE_THRESHOLD ? ` [low confidence: ${confidence.toFixed(2)}]` : confidence < 0.80 ? ` [conf: ${confidence.toFixed(2)}]` : "";
    const existing = (log?.transcript as string) ?? "";
    const newTranscript = `${existing}\n[${exchangeLabel}] Patient: ${speechResult || "(no response)"}${confidenceNote}`.trim();
    await supabase.from("call_logs").update({ transcript: newTranscript }).eq("id", log_id);

    // Check for urgent symptoms — alert the nurse but continue asking all remaining questions
    const isUrgent = detectUrgent(speechResult, language);
    if (isUrgent && exchange?.urgent_response) {
      fetch(`${appUrl}/api/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.INTERNAL_API_SECRET ?? ""}`,
        },
        body: JSON.stringify({ patient_id, reason: "cardiac_symptom", log_id }),
      }).catch((e) => console.error("alert fetch error:", e));

      // Acknowledge the symptom, then continue to next question
      const urgentText = (exchange.urgent_response as string).replace(/\[pause\]/gi, " ").replace(/\s+/g, " ").trim();
      const nextIndex = exchange_index + 1;
      const nextUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${nextIndex}`;
      return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${lang}" voice="${voice}"><prosody rate="medium">${escapeXml(urgentText)}</prosody></Say>
  <Redirect method="POST">${escapeXml(nextUrl)}</Redirect>
</Response>`);
    }

    // Advance to next exchange
    const nextIndex = exchange_index + 1;
    const nextUrl = `${appUrl}/api/call-webhook?patient_id=${patient_id}&call_slot=${call_slot}&log_id=${log_id}&exchange=${nextIndex}`;
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${escapeXml(nextUrl)}</Redirect></Response>`);

  } catch (e) {
    console.error("gather error:", e);
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you. Goodbye.</Say><Hangup/></Response>`);
  }
}
