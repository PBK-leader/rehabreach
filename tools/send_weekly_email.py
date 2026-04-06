"""
send_weekly_email.py
Generates and sends a weekly compliance summary email to the family contact via Resend.

Usage:
    python tools/send_weekly_email.py --patient_id <uuid> [--dry_run true]

Runs every Sunday. Reads the last 7 days of call_logs and sends a plain-language summary.
"""

import argparse
import json
import os
from datetime import datetime, timezone, timedelta

import anthropic
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
RESEND_API_KEY = os.environ["RESEND_API_KEY"]
APP_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

SYSTEM_PROMPT = """You are writing a weekly health update email to the family of an elderly cardiac patient.

Tone: warm, simple, non-clinical. The family may have no medical background.
- Never lead with bad news without immediately following it with context and next steps.
- Use the patient's first name throughout.
- Keep paragraphs short (2–3 sentences max).
- If all stats are positive, be warmly encouraging.
- If there were alerts, acknowledge them but be reassuring about the care team's response.

Return ONLY the HTML body of the email (no <html>/<head>/<body> wrappers). Use only <p>, <strong>, <ul>, <li> tags."""


def fetch_week_data(supabase, patient_id: str) -> dict:
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    patient = supabase.table("patients").select("*").eq("id", patient_id).single().execute()
    if not patient.data:
        raise ValueError(f"Patient {patient_id} not found")
    p = patient.data

    logs = (
        supabase.table("call_logs")
        .select("*")
        .eq("patient_id", patient_id)
        .gte("called_at", week_ago)
        .execute()
    )
    return {"patient": p, "logs": logs.data or []}


def compute_stats(logs: list) -> dict:
    total = len(logs)
    completed = sum(1 for l in logs if l["status"] == "completed")
    missed = sum(1 for l in logs if l["status"] == "missed")
    alerts = [l for l in logs if l["severity_flag"] in ("watch", "urgent")]
    urgent_alerts = [l for l in logs if l["severity_flag"] == "urgent"]

    # Medication adherence: count days where all medication tasks were completed
    # Approximate from parsed_results
    med_days = 0
    exercise_days = 0
    days_checked = set()
    for log in logs:
        if log["status"] != "completed" or not log.get("parsed_results"):
            continue
        day = log["called_at"][:10] if log.get("called_at") else None
        if not day:
            continue
        results = log["parsed_results"] or []
        if log["call_type"] == "medication":
            med_tasks = [r for r in results if "med" in r.get("task_name", "").lower() or r.get("task_name", "").lower().startswith("take")]
            if med_tasks and all(r.get("completed") for r in med_tasks):
                med_days += 1
        if log["call_type"] == "exercise":
            ex_tasks = [r for r in results if r.get("completed")]
            if ex_tasks:
                exercise_days += 1
                days_checked.add(day)

    return {
        "total_calls": total,
        "completed_calls": completed,
        "missed_calls": missed,
        "compliance_pct": round((completed / total * 100) if total else 0),
        "med_adherence_days": med_days,
        "exercise_days": exercise_days,
        "watch_alerts": len(alerts) - len(urgent_alerts),
        "urgent_alerts": len(urgent_alerts),
    }


def generate_email_body(patient: dict, stats: dict, dry_run: bool = False) -> str:
    first_name = patient["name"].split()[0]
    user_prompt = f"""Patient first name: {first_name}
Condition: {patient.get('cardiac_condition', 'cardiac')}
Week stats:
- Overall compliance: {stats['compliance_pct']}% ({stats['completed_calls']}/{stats['total_calls']} calls completed)
- Missed calls: {stats['missed_calls']}
- Medication adherence days: {stats['med_adherence_days']}/7
- Exercise completion days: {stats['exercise_days']}/7
- Watch-level alerts this week: {stats['watch_alerts']}
- Urgent alerts this week: {stats['urgent_alerts']}

Write the weekly family email now."""

    if dry_run:
        print("[DRY RUN] Would generate email with stats:")
        print(json.dumps(stats, indent=2))
        return "<p>[DRY RUN EMAIL BODY]</p>"

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text.strip()


def send_weekly_email(patient_id: str, dry_run: bool = False):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    data = fetch_week_data(supabase, patient_id)
    patient = data["patient"]
    logs = data["logs"]

    if not patient.get("family_email"):
        print(f"No family email for patient {patient_id}. Skipping.")
        return

    stats = compute_stats(logs)
    html_body = generate_email_body(patient, stats, dry_run=dry_run)

    first_name = patient["name"].split()[0]
    subject = f"Weekly update: {first_name}'s recovery — week ending {datetime.now().strftime('%d %b %Y')}"

    if dry_run:
        print(f"[DRY RUN] Would send email to {patient['family_email']}")
        print(f"Subject: {subject}")
        return {"dry_run": True}

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": f"RehabReach <noreply@rehabreach.app>",
            "to": [patient["family_email"]],
            "subject": subject,
            "html": html_body,
        },
        timeout=15,
    )
    resp.raise_for_status()
    result = resp.json()
    print(json.dumps({"email_id": result.get("id"), "to": patient["family_email"]}))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient_id", required=True)
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    send_weekly_email(args.patient_id, dry_run=dry)
