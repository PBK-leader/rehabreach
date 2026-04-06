import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";

const SLOT_FOCUS: Record<string, string> = {
  morning: "Sleep quality, chest pain overnight, resting heart rate",
  medication: "All prescribed cardiac medications taken",
  exercise: "Walking completed, duration, post-exercise symptoms",
  evening: "Overall wellbeing, diet adherence, leg/ankle swelling",
};

const SYSTEM_PROMPT = `You are a clinical script writer for a cardiac rehabilitation AI phone call system.
Generate a structured call script for an elderly patient. The script must:
- Be warm, gentle, and slow-paced. No medical jargon.
- Use short sentences (under 12 words where possible).
- Ask a maximum of 1 question per exchange.
- Insert [pause] cues every 2 sentences.
- Echo confirmation before moving to next question.
- Detect and escalate immediately if any urgent cardiac symptom is mentioned.
- Be written entirely in the patient's specified language.

Return ONLY valid JSON in this exact structure:
{
  "language": "en" | "hi",
  "call_slot": "morning" | "medication" | "exercise" | "evening",
  "greeting": "<opening sentence>",
  "exchanges": [
    {
      "task_name": "<task identifier>",
      "question": "<what the AI asks>",
      "confirmation_echo": "<what AI says after patient confirms>",
      "alert_trigger": true | false,
      "alert_threshold": "<optional>",
      "urgent_response": "<what AI says if urgent symptom — only if alert_trigger is true>"
    }
  ],
  "closing": "<farewell sentence>"
}`;

export async function generateScript(patientId: string, callSlot: string): Promise<object> {
  const supabase = createServerClient();

  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();
  if (pErr || !patient) throw new Error(`Patient ${patientId} not found`);

  const { data: plans } = await supabase
    .from("recovery_plans")
    .select("id")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1);

  let tasks: { task_name: string; task_type: string; is_alert_trigger: boolean; threshold_value: string | null }[] = [];
  if (plans && plans.length > 0) {
    const { data: taskData } = await supabase
      .from("tasks")
      .select("task_name, task_type, is_alert_trigger, threshold_value")
      .eq("plan_id", plans[0].id)
      .eq("call_slot", callSlot);
    tasks = taskData ?? [];
  }

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : "unknown";

  const taskLines = tasks.length
    ? tasks.map((t) => `- ${t.task_name} (type: ${t.task_type}, alert_trigger: ${t.is_alert_trigger}, threshold: ${t.threshold_value ?? "N/A"})`).join("\n")
    : "(no specific tasks — use standard slot questions)";

  const userPrompt = `Patient: ${patient.name}, age ${age}, condition: ${patient.cardiac_condition ?? "cardiac"}.
Language: ${patient.language}
Call slot: ${callSlot} — focus: ${SLOT_FOCUS[callSlot] ?? ""}
Tasks to cover:
${taskLines}
Heart rate alert threshold: ${patient.heart_rate_threshold ?? 100} bpm resting.
Generate the call script now.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  let raw = (message.content[0] as { type: string; text: string }).text.trim();
  if (raw.startsWith("```")) {
    raw = raw.split("```")[1];
    if (raw.startsWith("json")) raw = raw.slice(4);
  }
  return JSON.parse(raw);
}
