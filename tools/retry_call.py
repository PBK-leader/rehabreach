"""
retry_call.py
Re-attempts a missed call once, exactly 30 minutes after the original no-answer.

Usage:
    python tools/retry_call.py --log_id <call_log_uuid> [--dry_run true]

Reads the original call log, waits if needed, then calls make_call.py.
Updates severity_flag to 'watch' after 2 consecutive missed slots, 'urgent' after 3.
"""

import argparse
import json
import os
import time
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]


def count_consecutive_misses(supabase, patient_id: str) -> int:
    logs = (
        supabase.table("call_logs")
        .select("status, call_slot_scheduled")
        .eq("patient_id", patient_id)
        .order("call_slot_scheduled", desc=True)
        .limit(10)
        .execute()
    )
    count = 0
    for log in logs.data or []:
        if log["status"] in ("missed", "no_answer"):
            count += 1
        else:
            break
    return count


def retry_call(log_id: str, dry_run: bool = False):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    original = supabase.table("call_logs").select("*").eq("id", log_id).single().execute()
    if not original.data:
        raise ValueError(f"Call log {log_id} not found")
    log = original.data

    if log["status"] != "no_answer":
        print(f"Log {log_id} has status '{log['status']}' — only retrying no_answer calls.")
        return

    # Check timing — must wait 30 minutes from called_at
    called_at = datetime.fromisoformat(log["called_at"].replace("Z", "+00:00"))
    retry_after = called_at + timedelta(minutes=30)
    now = datetime.now(timezone.utc)

    if now < retry_after:
        wait_seconds = (retry_after - now).total_seconds()
        print(f"Waiting {wait_seconds:.0f}s until 30-minute window...")
        if not dry_run:
            time.sleep(wait_seconds)

    # Enforce call hours: 7am–9pm patient local time (approximated via UTC for now)
    current_hour = datetime.now(timezone.utc).hour
    if not (7 <= current_hour < 21):
        print("Outside allowed call hours (7am–9pm). Skipping retry, marking as missed.")
        supabase.table("call_logs").update({"status": "missed"}).eq("id", log_id).execute()
        return

    patient_id = log["patient_id"]
    call_slot = log["call_type"]

    if dry_run:
        print(f"[DRY RUN] Would retry call for patient {patient_id}, slot {call_slot}")
        return

    # Run the retry call
    import subprocess
    result = subprocess.run(
        ["python", "tools/make_call.py", "--patient_id", patient_id, "--call_slot", call_slot, "--retry_of", log_id],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Retry call failed: {result.stderr}")
        supabase.table("call_logs").update({"status": "missed"}).eq("id", log_id).execute()
    else:
        print(result.stdout)

    # Update severity flag based on consecutive misses
    misses = count_consecutive_misses(supabase, patient_id)
    if misses >= 3:
        # Trigger urgent alert
        supabase.table("call_logs").update({"severity_flag": "urgent"}).eq("patient_id", patient_id).eq("status", "missed").execute()
        print(f"URGENT: {misses} consecutive missed calls. Triggering send_alert.py...")
        subprocess.run(["python", "tools/send_alert.py", "--patient_id", patient_id, "--reason", "3_consecutive_missed_calls"])
    elif misses >= 2:
        supabase.table("call_logs").update({"severity_flag": "watch"}).eq("patient_id", patient_id).eq("status", "missed").execute()
        print(f"WATCH: {misses} consecutive missed calls flagged.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--log_id", required=True)
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    retry_call(args.log_id, dry_run=dry)
