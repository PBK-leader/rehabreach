"""
parse_call.py
Uses the Anthropic API to parse a call transcript into structured compliance JSON.

Usage:
    python tools/parse_call.py --log_id <call_log_uuid> [--dry_run true]

Reads the transcript from call_logs, parses it, and writes parsed_results back.
"""

import argparse
import json
import os

import anthropic
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

SYSTEM_PROMPT = """You are a clinical compliance parser for a cardiac rehabilitation programme.
Given a call transcript between an AI and an elderly cardiac patient, extract structured compliance data.

Return ONLY valid JSON — an array of task results:
[
  {
    "task_name": "<task identifier>",
    "completed": true | false | null,
    "notes": "<brief free-text note — max 100 chars>",
    "value_reported": "<optional — e.g. heart rate '88 bpm', walk duration '15 minutes'>",
    "alert_flag": "normal" | "watch" | "urgent"
  }
]

Rules:
- completed = true if patient confirmed doing the task
- completed = false if patient said they didn't do it or it's clear they missed it
- completed = null if unclear or not discussed
- alert_flag = "urgent" if ANY cardiac symptom: chest pain, pressure, shortness of breath at rest, near-fainting, severe confusion
- alert_flag = "watch" if: missed 2+ meds, ankle swelling, poor sleep 3+ nights, exercise missed 2+ days
- alert_flag = "normal" otherwise
- If the patient went off-topic, note that but still extract what you can.
- Respond in the same language as the transcript."""


def parse_call(log_id: str, dry_run: bool = False) -> list:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    log = supabase.table("call_logs").select("*").eq("id", log_id).single().execute()
    if not log.data:
        raise ValueError(f"Call log {log_id} not found")
    entry = log.data

    if not entry.get("transcript"):
        raise ValueError(f"No transcript found for log {log_id}")

    # Fetch the tasks for context
    patient_id = entry["patient_id"]
    call_slot = entry["call_type"]
    plan = (
        supabase.table("recovery_plans")
        .select("id")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    tasks = []
    if plan.data:
        tasks_result = (
            supabase.table("tasks")
            .select("task_name, task_type, is_alert_trigger")
            .eq("plan_id", plan.data[0]["id"])
            .eq("call_slot", call_slot)
            .execute()
        )
        tasks = tasks_result.data or []

    task_context = "\n".join(f"- {t['task_name']} (alert_trigger: {t['is_alert_trigger']})" for t in tasks)
    user_prompt = f"""Call slot: {call_slot}
Expected tasks:
{task_context if task_context else '(no specific tasks — infer from transcript)'}

Transcript:
{entry['transcript']}

Parse the compliance results now."""

    if dry_run:
        print("[DRY RUN] Would call Anthropic API with transcript:")
        print(entry["transcript"][:200], "...")
        return [{"dry_run": True}]

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    parsed = json.loads(raw)

    # Determine overall severity flag
    flags = [r.get("alert_flag", "normal") for r in parsed]
    if "urgent" in flags:
        overall_flag = "urgent"
    elif "watch" in flags:
        overall_flag = "watch"
    else:
        overall_flag = "normal"

    # Write results back to call_logs
    supabase.table("call_logs").update({
        "parsed_results": parsed,
        "severity_flag": overall_flag,
        "status": "completed",
    }).eq("id", log_id).execute()

    print(json.dumps(parsed, indent=2, ensure_ascii=False))
    return parsed


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--log_id", required=True)
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    parse_call(args.log_id, dry_run=dry)
