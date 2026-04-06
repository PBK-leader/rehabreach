import twilio from "twilio";
import { createServerClient } from "@/lib/supabase";

const REASON_MESSAGES: Record<string, string> = {
  cardiac_symptom: "URGENT: {name} reported a potential cardiac symptom during their {time} check-in call. Please contact them immediately. Phone: {phone}",
  "3_consecutive_missed_calls": "ALERT: {name} has missed 3 consecutive check-in calls. Unable to reach them. Phone: {phone}. Please follow up.",
  manual: "ALERT: Manual alert triggered for patient {name}. Phone: {phone}. Please check in.",
};

export async function sendAlert(
  patientId: string,
  reason: string,
  logId?: string,
  dryRun = false
): Promise<object> {
  const supabase = createServerClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("name, phone")
    .eq("id", patientId)
    .single();
  if (error || !patient) throw new Error(`Patient ${patientId} not found`);

  const timeStr = new Date().toUTCString().slice(17, 22) + " UTC";
  const template = REASON_MESSAGES[reason] ?? REASON_MESSAGES.manual;
  const messageBody = template
    .replace("{name}", patient.name)
    .replace("{phone}", patient.phone)
    .replace("{time}", timeStr);

  if (dryRun) {
    return { dry_run: true, to: process.env.NURSE_ALERT_SMS_NUMBER, body: messageBody };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const msg = await client.messages.create({
    body: messageBody,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: process.env.NURSE_ALERT_SMS_NUMBER!,
  });

  if (logId) {
    await supabase
      .from("call_logs")
      .update({ severity_flag: "urgent", status: "alert_fired" })
      .eq("id", logId);
  }

  return { message_sid: msg.sid, to: process.env.NURSE_ALERT_SMS_NUMBER, reason };
}
