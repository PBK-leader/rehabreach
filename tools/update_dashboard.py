"""
update_dashboard.py
Writes parsed call results to Supabase and triggers an alert if urgency detected.

Usage:
    python tools/update_dashboard.py --log_id <call_log_uuid> [--dry_run true]

Reads the parsed_results from call_logs and checks severity_flag.
If urgent, calls send_alert.py.
"""

import argparse
import json
import os
import subprocess

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]


def update_dashboard(log_id: str, dry_run: bool = False):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    log = supabase.table("call_logs").select("*").eq("id", log_id).single().execute()
    if not log.data:
        raise ValueError(f"Call log {log_id} not found")
    entry = log.data

    flag = entry.get("severity_flag", "normal")
    patient_id = entry["patient_id"]

    if dry_run:
        print(f"[DRY RUN] Log {log_id}: severity_flag={flag}")
        print(f"[DRY RUN] parsed_results: {json.dumps(entry.get('parsed_results', []), indent=2)}")
        return

    if flag == "urgent":
        print(f"URGENT flag on log {log_id} — triggering send_alert.py")
        subprocess.run(
            ["python", "tools/send_alert.py", "--patient_id", patient_id, "--reason", "cardiac_symptom", "--log_id", log_id],
        )
    elif flag == "watch":
        print(f"WATCH flag on log {log_id} — dashboard updated, no immediate alert.")

    print(json.dumps({"log_id": log_id, "severity_flag": flag, "status": "dashboard updated"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--log_id", required=True)
    parser.add_argument("--dry_run", default="false")
    args = parser.parse_args()

    dry = args.dry_run.lower() == "true"
    update_dashboard(args.log_id, dry_run=dry)
