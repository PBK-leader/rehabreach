import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are a clinical compliance parser for a cardiac rehabilitation programme.
Given a call transcript between an AI and an elderly cardiac patient, extract structured compliance data.

Return ONLY valid JSON — an array of task results:
[
  {
    "task_name": "<task identifier>",
    "completed": true | false | null,
    "notes": "<brief free-text note — max 100 chars>",
    "value_reported": "<optional — e.g. heart rate '88 bpm', or the raw rating e.g. '7/10'>",
    "rating": <1-10 integer if the patient gave a numeric rating, otherwise null>,
    "conclusion": "<human-readable interpretation combining the rating AND the patient's own description — e.g. 'Sleep rated 7/10 - Slept well but woke up once' or 'Chest pain rated 3/10 - Mild tightness in the morning'>",
    "alert_flag": "normal" | "watch" | "urgent"
  }
]

Rules:
- completed = true if patient confirmed doing the task or gave a rating indicating acceptable status
- completed = false if patient said they didn't do it or the rating indicates a significant problem
- completed = null if unclear or not discussed
- Transcript lines marked [low confidence: X.XX] or [conf: X.XX] — treat as completed = null unless clearly interpretable

Rating interpretation guidelines (use for conclusion and alert_flag):
- Sleep quality (higher = better): 1-3 Poor (watch), 4-6 Fair (normal), 7-10 Good (normal)
- Chest pain/discomfort (higher = worse): 1-2 None/minimal (normal), 3-5 Mild (watch), 6-8 Moderate (urgent), 9-10 Severe (urgent)
- Breathlessness (higher = worse): 1-3 Minimal (normal), 4-6 Moderate (watch), 7-10 Severe (urgent)
- Fatigue/energy (higher = better): 1-3 Very fatigued (watch), 4-6 Moderate (normal), 7-10 Good energy (normal)
- Overall wellbeing (higher = better): 1-3 Poor (watch), 4-6 Moderate (normal), 7-10 Good (normal)
- Swelling/oedema (higher = worse): 1-3 Minimal (normal), 4-6 Moderate (watch), 7-10 Severe (urgent)

- alert_flag = "urgent" if: chest pain rated 6+, breathlessness rated 7+, swelling rated 7+, or any direct cardiac symptom mentioned
- alert_flag = "watch" if: sleep rated 1-3, fatigue rated 1-3, chest pain rated 3-5, breathlessness rated 4-6, missed 2+ medications
- alert_flag = "normal" otherwise`;

export async function parseCall(logId: string, dryRun = false): Promise<object[]> {
  const supabase = createServerClient();

  const { data: log, error } = await supabase
    .from("call_logs")
    .select("*")
    .eq("id", logId)
    .single();
  if (error || !log) throw new Error(`Call log ${logId} not found`);
  if (!log.transcript) throw new Error(`No transcript for log ${logId}`);

  const { data: plans } = await supabase
    .from("recovery_plans")
    .select("id")
    .eq("patient_id", log.patient_id)
    .order("created_at", { ascending: false })
    .limit(1);

  let taskContext = "";
  if (plans && plans.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("task_name, is_alert_trigger")
      .eq("plan_id", plans[0].id)
      .eq("call_slot", log.call_type);
    if (tasks) {
      taskContext = tasks.map((t) => `- ${t.task_name} (alert_trigger: ${t.is_alert_trigger})`).join("\n");
    }
  }

  if (dryRun) {
    return [{ dry_run: true, transcript_length: log.transcript.length }];
  }

  const userPrompt = `Call slot: ${log.call_type}
Expected tasks:
${taskContext || "(no specific tasks — infer from transcript)"}

Transcript:
${log.transcript}

Parse the compliance results now.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  let raw = (message.content[0] as { type: string; text: string }).text.trim();
  if (raw.startsWith("```")) {
    raw = raw.split("```")[1];
    if (raw.startsWith("json")) raw = raw.slice(4);
  }
  const parsed: { alert_flag: string }[] = JSON.parse(raw);

  const flags = parsed.map((r) => r.alert_flag);
  const overallFlag = flags.includes("urgent") ? "urgent" : flags.includes("watch") ? "watch" : "normal";

  await supabase
    .from("call_logs")
    .update({ parsed_results: parsed, severity_flag: overallFlag, status: "completed" })
    .eq("id", logId);

  return parsed;
}
