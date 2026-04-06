"""
send_alert.py
Sends an urgent SMS alert to the nurse/care team via Twilio.

Usage:
    python tools/send_alert.py --patient_id <uuid> --reason <reason_code> [--dry_run true]

reason_code: cardiac_symptom | 3_consecutive_missed_calls | manual
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
NURSE_ALERT_SMS_NUMBER = os.environ["NURSE_ALERT_SMS_NUMBER"]

REASON_MESSAGES = {
    "cardiac_symptom": "URGENT: {name} reported a potential cardiac symptom during their {time} check-in call. Please contact them immediately. Phone: {phone}",
    "3_consecutive_missed_calls": "ALERT: {name} has missed 3 consecutive check-in calls. Unable to reach them. Phone: {phone}. Please follow up.",
    "manual": "ALERT: Manual alert triggered for patient {name}. Phone: {phone}. Please check in.",
}


def send_alert(patient_id: str, reason: str, log_id: str = None, dry_run: bool = False):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    patient = supabase.table("patients").select("name, phone").eq("id", patient_id).single().execute()
    if not patient.data:
        raise ValueError(f"Patient {patient_id} not found")
    p = patient.data

    time_str = datetime.now(timezone.utc).strftime("%H:%M UTC")
    template = REASON_MESSAGES.get(reason, REASON_MESSAGES["manual"])
    message_body = template.format(name=p["name"], phone=p["phone"], time=time_str)

    if dry_run:
        print(f"[DRY RUN] Would send SMS to {NURSE_ALERT_SMS_NUMBER}:")
        print(message_body)
        return {"dry_run": True}

    twilio = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    msg = twilio.messages.create(
        body=message_body,
        from_=TWILIO_PHONE_NUMBER,
        to=NURSE_ALERT_SMS_NUMBER,
    )

    # Update the call log's severity flag if log_id provided
    if log_id:
        supabase.table("call_logs").update({"severity_flag": "urgent", "status": "alert_fired"}).eq("id", log_id).execute()

    result = {"message_sid": msg.sid, "to": NURSE_ALERT_SMS_NUMBER, "reason": reason}
    print(json.dumps(result))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient_id", required=True)
    parser.add_argument("--reason", required=True, choices=["cardiac_symptom", "3_consecutive_missed_calls", "manual"])
    parser.add_argument("--log_id", default=None)
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    send_alert(args.patient_id, args.reason, log_id=args.log_id, dry_run=dry)
