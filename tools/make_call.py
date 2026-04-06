"""
make_call.py
Places an outbound Twilio call. Uses Twilio's built-in TTS via the webhook —
no ElevenLabs dependency required.

Usage:
    python tools/make_call.py --patient_id <uuid> --call_slot <slot> [--dry_run true]

Reads the script from .tmp/script_<patient_id>_<call_slot>.json (generate_script.py must run first).
Logs the call attempt to call_logs in Supabase.
"""

import argparse
import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client
from twilio.rest import Client as TwilioClient

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
TWILIO_PHONE_NUMBER = os.environ["TWILIO_PHONE_NUMBER"]
APP_URL = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")


def log_call(supabase, patient_id: str, call_slot: str, language: str, status: str, retry_of=None) -> str:
    row = {
        "patient_id": patient_id,
        "call_type": call_slot,
        "call_slot_scheduled": datetime.now(timezone.utc).isoformat(),
        "called_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "language": language,
        "severity_flag": "normal",
    }
    if retry_of:
        row["retry_of"] = retry_of
    result = supabase.table("call_logs").insert(row).execute()
    return result.data[0]["id"]


def make_call(patient_id: str, call_slot: str, dry_run: bool = False, retry_of: str = None):
    script_path = f".tmp/script_{patient_id}_{call_slot}.json"
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Script not found: {script_path}. Run generate_script.py first.")

    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    patient = supabase.table("patients").select("phone, language, name").eq("id", patient_id).single().execute()
    if not patient.data:
        raise ValueError(f"Patient {patient_id} not found")
    p = patient.data
    language = p["language"]

    if dry_run:
        print(f"[DRY RUN] Would call {p['phone']} for patient {p['name']}")
        print(f"[DRY RUN] Script greeting: {script.get('greeting', '')}")
        print(f"[DRY RUN] Exchanges: {len(script.get('exchanges', []))}")
        print(f"[DRY RUN] Webhook URL: {APP_URL}/api/call-webhook?patient_id={patient_id}&call_slot={call_slot}&log_id=<log_id>")
        return {"dry_run": True}

    # Log the call attempt
    call_log_id = log_call(supabase, patient_id, call_slot, language, "initiated", retry_of)

    # Place the Twilio call — webhook drives the conversation using Twilio TTS
    twilio = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    webhook_url = f"{APP_URL}/api/call-webhook?patient_id={patient_id}&call_slot={call_slot}&log_id={call_log_id}"
    call = twilio.calls.create(
        to=p["phone"],
        from_=TWILIO_PHONE_NUMBER,
        url=webhook_url,
        status_callback=f"{APP_URL}/api/call-webhook/status?log_id={call_log_id}",
        status_callback_event=["completed", "no-answer", "failed"],
        timeout=30,
        machine_detection="Enable",
    )

    result = {"call_sid": call.sid, "log_id": call_log_id, "status": call.status}
    print(json.dumps(result))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient_id", required=True)
    parser.add_argument("--call_slot", required=True, choices=["morning", "medication", "exercise", "evening"])
    parser.add_argument("--dry_run", default="false")
    parser.add_argument("--retry_of", default=None, help="call_log id if this is a retry")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    make_call(args.patient_id, args.call_slot, dry_run=dry, retry_of=args.retry_of)
