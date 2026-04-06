"""
generate_script.py
Turns a patient's task list into a structured bilingual call script JSON.

Usage:
    python tools/generate_script.py --patient_id <uuid> --call_slot <morning|medication|exercise|evening> [--dry_run true]

Output:
    JSON written to stdout and optionally to .tmp/script_<patient_id>_<call_slot>.json
"""

import argparse
import json
import os
import sys
from datetime import datetime

import anthropic
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

SLOT_FOCUS = {
    "morning": "Sleep quality, chest pain overnight, resting heart rate",
    "medication": "All prescribed cardiac medications taken",
    "exercise": "Walking completed, duration, post-exercise symptoms",
    "evening": "Overall wellbeing, diet adherence, leg/ankle swelling",
}

SYSTEM_PROMPT = """You are a clinical script writer for a cardiac rehabilitation AI phone call system.
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
      "alert_threshold": "<optional — e.g. heart rate > 100>",
      "urgent_response": "<what AI says if urgent symptom detected — only if alert_trigger is true>"
    }
  ],
  "closing": "<farewell sentence>"
}"""


def fetch_patient_and_tasks(supabase, patient_id: str, call_slot: str) -> dict:
    patient = supabase.table("patients").select("*").eq("id", patient_id).single().execute()
    if not patient.data:
        raise ValueError(f"Patient {patient_id} not found")
    p = patient.data

    plan = (
        supabase.table("recovery_plans")
        .select("id")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not plan.data:
        raise ValueError(f"No recovery plan for patient {patient_id}")
    plan_id = plan.data[0]["id"]

    tasks = (
        supabase.table("tasks")
        .select("*")
        .eq("plan_id", plan_id)
        .eq("call_slot", call_slot)
        .execute()
    )
    return {"patient": p, "tasks": tasks.data or []}


def build_user_prompt(patient: dict, tasks: list, call_slot: str) -> str:
    task_lines = "\n".join(
        f"- {t['task_name']} (type: {t['task_type']}, alert_trigger: {t['is_alert_trigger']}, threshold: {t.get('threshold_value', 'N/A')})"
        for t in tasks
    )
    return f"""Patient: {patient['name']}, age {(datetime.now().year - datetime.fromisoformat(str(patient['date_of_birth'])).year) if patient.get('date_of_birth') else 'unknown'}, condition: {patient.get('cardiac_condition', 'cardiac')}.
Language: {patient['language']}
Call slot: {call_slot} — focus: {SLOT_FOCUS.get(call_slot, '')}
Tasks to cover:
{task_lines if task_lines else '(no specific tasks — use standard slot questions)'}
Heart rate alert threshold: {patient.get('heart_rate_threshold', 100)} bpm resting.
Generate the call script now."""


def generate_script(patient_id: str, call_slot: str, dry_run: bool = False) -> dict:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    data = fetch_patient_and_tasks(supabase, patient_id, call_slot)
    patient = data["patient"]
    tasks = data["tasks"]

    user_prompt = build_user_prompt(patient, tasks, call_slot)

    if dry_run:
        print("[DRY RUN] Would call Anthropic API with prompt:")
        print(user_prompt)
        return {"dry_run": True, "patient_id": patient_id, "call_slot": call_slot}

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = message.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    script = json.loads(raw)

    # Write to .tmp for debugging (no PII in filename)
    os.makedirs(".tmp", exist_ok=True)
    tmp_path = f".tmp/script_{patient_id}_{call_slot}.json"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(script, f, indent=2, ensure_ascii=False)

    return script


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient_id", required=True)
    parser.add_argument("--call_slot", required=True, choices=["morning", "medication", "exercise", "evening"])
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    result = generate_script(args.patient_id, args.call_slot, dry_run=dry)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))
