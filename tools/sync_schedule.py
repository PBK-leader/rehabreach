"""
sync_schedule.py
Schedules the daily 4-call cycle for all active patients.
Meant to run once per day (e.g. via cron at 6am).

Usage:
    python tools/sync_schedule.py [--dry_run true]
"""

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

SLOTS = ["morning", "medication", "exercise", "evening"]
SLOT_DEFAULT_HOURS = {"morning": 8, "medication": 10, "exercise": 14, "evening": 19}


def sync_schedule(dry_run: bool = False):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    patients = supabase.table("patients").select("id, name, call_start_hour").execute()
    if not patients.data:
        print("No patients found.")
        return

    today = datetime.now(timezone.utc).date()
    scheduled = []

    for patient in patients.data:
        patient_id = patient["id"]
        for slot in SLOTS:
            hour = SLOT_DEFAULT_HOURS[slot]
            # Adjust morning slot by patient's preferred call start hour
            if slot == "morning":
                hour = patient.get("call_start_hour", 8)

            # Check if already logged today for this slot
            existing = (
                supabase.table("call_logs")
                .select("id")
                .eq("patient_id", patient_id)
                .eq("call_type", slot)
                .gte("call_slot_scheduled", f"{today}T00:00:00Z")
                .execute()
            )
            if existing.data:
                continue  # Already scheduled/run today

            scheduled.append({"patient_id": patient_id, "slot": slot, "hour": hour})
            if not dry_run:
                # In production, these would be queued or run via cron at the appropriate hour.
                # Here we log the intent and the actual calling is triggered separately.
                print(f"Scheduled: {patient['name']} — {slot} at {hour:02d}:00")

    if dry_run:
        print(f"[DRY RUN] Would schedule {len(scheduled)} calls:")
        print(json.dumps(scheduled, indent=2))
    else:
        print(json.dumps({"scheduled": len(scheduled), "date": str(today)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()
    sync_schedule(dry_run=args.dry_run.lower() == "true")
