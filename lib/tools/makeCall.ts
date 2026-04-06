import twilio from "twilio";
import { createServerClient } from "@/lib/supabase";
import { generateScript } from "./generateScript";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function synthesiseAudio(text: string, language: string): Promise<Buffer> {
  const voiceId = language === "hi"
    ? process.env.ELEVENLABS_VOICE_ID_HI!
    : process.env.ELEVENLABS_VOICE_ID_EN!;

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`ElevenLabs error ${resp.status}: ${JSON.stringify(err)}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

export async function makeCall(
  patientId: string,
  callSlot: string,
  dryRun = false,
  retryOf?: string
): Promise<object> {
  const supabase = createServerClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("phone, language, name")
    .eq("id", patientId)
    .single();
  if (error || !patient) throw new Error(`Patient ${patientId} not found`);

  // Generate script
  const script = await generateScript(patientId, callSlot) as Record<string, unknown>;
  const language = patient.language as string;

  if (dryRun) {
    const exchanges = script.exchanges as unknown[];
    return {
      dry_run: true,
      patient: patient.name,
      phone: patient.phone,
      greeting: script.greeting,
      exchanges: exchanges?.length ?? 0,
    };
  }

  // Test ElevenLabs synthesis with greeting
  await synthesiseAudio(script.greeting as string, language);

  // Log call attempt
  const { data: logData } = await supabase
    .from("call_logs")
    .insert({
      patient_id: patientId,
      call_type: callSlot,
      call_slot_scheduled: new Date().toISOString(),
      called_at: new Date().toISOString(),
      status: "initiated",
      language,
      severity_flag: "normal",
      call_script: script,
      ...(retryOf ? { retry_of: retryOf } : {}),
    })
    .select()
    .single();

  const logId = logData?.id;

  // Place Twilio call
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const call = await client.calls.create({
    to: patient.phone,
    from: process.env.TWILIO_PHONE_NUMBER!,
    url: `${APP_URL}/api/call-webhook?patient_id=${patientId}&call_slot=${callSlot}&log_id=${logId}`,
    statusCallback: `${APP_URL}/api/call-webhook/status?log_id=${logId}`,
    statusCallbackEvent: ["completed", "no-answer", "failed"],
    timeout: 30,
    machineDetection: "Enable",
  });

  return { call_sid: call.sid, log_id: logId, status: call.status };
}
