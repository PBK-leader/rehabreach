import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are writing a weekly health update email to the family of an elderly cardiac patient.

Tone: warm, simple, non-clinical. The family may have no medical background.
- Never lead with bad news without immediately following with context and next steps.
- Use the patient's first name throughout.
- Keep paragraphs short (2–3 sentences max).
- If all stats are positive, be warmly encouraging.
- If there were urgent alerts, acknowledge them but be reassuring about the care team's response.

Return ONLY the HTML body (no html/head/body wrappers). Use only <p>, <strong>, <ul>, <li> tags.`;

export async function sendWeeklyEmail(patientId: string, dryRun = false): Promise<object> {
  const supabase = createServerClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();
  if (error || !patient) throw new Error(`Patient ${patientId} not found`);
  if (!patient.family_email) return { skipped: true, reason: "no family_email" };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from("call_logs")
    .select("*")
    .eq("patient_id", patientId)
    .gte("called_at", weekAgo);

  const allLogs = logs ?? [];
  const total = allLogs.length;
  const completed = allLogs.filter((l) => l.status === "completed").length;
  const missed = allLogs.filter((l) => l.status === "missed").length;
  const urgentAlerts = allLogs.filter((l) => l.severity_flag === "urgent").length;
  const watchAlerts = allLogs.filter((l) => l.severity_flag === "watch").length;

  // Count med adherence days and exercise days from parsed_results
  let medDays = 0;
  let exerciseDays = 0;
  const seenDays = new Set<string>();
  for (const log of allLogs) {
    if (log.status !== "completed" || !log.parsed_results) continue;
    const day = log.called_at?.slice(0, 10);
    if (!day) continue;
    const results = log.parsed_results as { task_name: string; completed: boolean | null }[];
    if (log.call_type === "medication") {
      const medTasks = results.filter((r) => r.task_name.toLowerCase().includes("take") || r.task_name.toLowerCase().includes("lena"));
      if (medTasks.length && medTasks.every((r) => r.completed)) medDays++;
    }
    if (log.call_type === "exercise" && !seenDays.has(day)) {
      if (results.some((r) => r.completed)) { exerciseDays++; seenDays.add(day); }
    }
  }

  const firstName = patient.name.split(" ")[0];
  const compliancePct = total ? Math.round((completed / total) * 100) : 0;

  const userPrompt = `Patient first name: ${firstName}
Condition: ${patient.cardiac_condition ?? "cardiac"}
Week stats:
- Overall compliance: ${compliancePct}% (${completed}/${total} calls completed)
- Missed calls: ${missed}
- Medication adherence days: ${medDays}/7
- Exercise completion days: ${exerciseDays}/7
- Watch-level alerts this week: ${watchAlerts}
- Urgent alerts this week: ${urgentAlerts}

Write the weekly family email now.`;

  if (dryRun) {
    return { dry_run: true, to: patient.family_email, stats: { compliancePct, medDays, exerciseDays, urgentAlerts } };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const htmlBody = (message.content[0] as { type: string; text: string }).text.trim();

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const subject = `Weekly update: ${firstName}'s recovery — week ending ${today}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error: emailError } = await resend.emails.send({
    from: "RehabReach <noreply@rehabreach.app>",
    to: [patient.family_email],
    subject,
    html: htmlBody,
  });
  if (emailError) throw new Error(emailError.message);

  return { email_id: data?.id, to: patient.family_email };
}
