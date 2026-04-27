import twilio from "twilio";
import { createServerClient } from "@/lib/supabase";
import { generateScript } from "./generateScript";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

  // Log call attempt
  const { data: logData, error: insertError } = await supabase
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

  if (insertError || !logData?.id) {
    throw new Error(`Failed to create call log: ${insertError?.message ?? "no id returned"}`);
  }

  const logId = logData.id;

  // Place Twilio call
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const call = await client.calls.create({
    to: patient.phone,
    from: process.env.TWILIO_PHONE_NUMBER!,
    url: `${APP_URL}/api/call-webhook?patient_id=${patientId}&call_slot=${callSlot}&log_id=${logId}`,
    statusCallback: `${APP_URL}/api/call-webhook/status?log_id=${logId}`,
    statusCallbackEvent: ["completed", "no-answer", "failed"],
    timeout: 30,
  });

  return { call_sid: call.sid, log_id: logId, status: call.status };
}
