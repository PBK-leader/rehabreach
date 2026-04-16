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
    "value_reported": "<optional — e.g. heart rate '88 bpm'>",
    "alert_flag": "normal" | "watch" | "urgent"
  }
]

Rules:
- completed = true if patient confirmed doing the task
- completed = false if patient said they didn't do it
- completed = null if unclear or not discussed
- Transcript lines marked [low confidence: X.XX] or [conf: X.XX] indicate uncertain STT — treat these as completed = null unless the text is still clearly interpretable
- alert_flag = "urgent" if ANY cardiac symptom: chest pain, pressure, shortness of breath at rest, near-fainting, severe confusion
- alert_flag = "watch" if: missed 2+ meds, ankle swelling, poor sleep 3+ nights, exercise missed 2+ days
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
