"""
seed_demo_patients.py
Seeds the two demo patients (Margaret Chen and Meera Sharma) with recovery plans and tasks.

Usage:
    python tools/seed_demo_patients.py

Set phone numbers in the script below before running.
"""

import os
from datetime import date

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# ── UPDATE THESE WITH YOUR OWN NUMBERS FOR TESTING ──────────────────────────
MARGARET_PHONE = "+16178206669"   # Your phone number for testing
MEERA_PHONE    = "+16178206669"   # Your phone number for testing
TEST_EMAIL     = "pulkitb001@gmail.com" # Your email for testing
# ────────────────────────────────────────────────────────────────────────────


def seed():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Create a demo nurse user
    nurse = supabase.table("users").upsert(
        {"email": "nurse@rehabreach.demo", "role": "nurse"},
        on_conflict="email"
    ).execute()
    nurse_id = nurse.data[0]["id"]
    print(f"Nurse ID: {nurse_id}")

    # ── Margaret Chen (English, post-CABG) ───────────────────────────────────
    margaret = supabase.table("patients").insert({
        "name": "Margaret Chen",
        "phone": MARGARET_PHONE,
        "date_of_birth": "1950-03-15",
        "discharge_date": str(date.today()),
        "cardiac_condition": "cabg",
        "language": "en",
        "nurse_id": nurse_id,
        "family_email": TEST_EMAIL,
        "heart_rate_threshold": 100,
        "call_start_hour": 8,
        "timezone": "UTC",
    }).execute()
    margaret_id = margaret.data[0]["id"]
    print(f"Margaret ID: {margaret_id}")

    margaret_plan = supabase.table("recovery_plans").insert({
        "patient_id": margaret_id,
        "notes": "3 weeks post-CABG. Low sodium diet, 1.5L fluid restriction. 15-min walk twice daily.",
        "phase": 3,
    }).execute()
    plan_id = margaret_plan.data[0]["id"]

    margaret_tasks = [
        # Morning slot
        {"plan_id": plan_id, "task_name": "Sleep quality check", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": False, "call_slot": "morning"},
        {"plan_id": plan_id, "task_name": "Chest pain check", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": True, "call_slot": "morning"},
        {"plan_id": plan_id, "task_name": "Resting heart rate", "task_type": "vitals", "frequency": "daily", "is_alert_trigger": True, "threshold_value": "100", "call_slot": "morning"},
        # Medication slot
        {"plan_id": plan_id, "task_name": "Take Metoprolol", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        {"plan_id": plan_id, "task_name": "Take Aspirin 75mg", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        {"plan_id": plan_id, "task_name": "Take Atorvastatin", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        {"plan_id": plan_id, "task_name": "Take Lisinopril", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        # Exercise slot
        {"plan_id": plan_id, "task_name": "Morning 15-minute walk", "task_type": "exercise", "frequency": "twice_daily", "is_alert_trigger": False, "call_slot": "exercise"},
        {"plan_id": plan_id, "task_name": "Post-exercise symptoms", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": True, "call_slot": "exercise"},
        # Evening slot
        {"plan_id": plan_id, "task_name": "Overall wellbeing check", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": False, "call_slot": "evening"},
        {"plan_id": plan_id, "task_name": "Diet adherence (low sodium)", "task_type": "diet", "frequency": "daily", "is_alert_trigger": False, "call_slot": "evening"},
        {"plan_id": plan_id, "task_name": "Ankle/leg swelling check", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": True, "call_slot": "evening"},
    ]
    supabase.table("tasks").insert(margaret_tasks).execute()
    print(f"Margaret tasks created: {len(margaret_tasks)}")

    # ── Meera Sharma (Hindi, post-MI) ─────────────────────────────────────────
    meera = supabase.table("patients").insert({
        "name": "Meera Sharma",
        "phone": MEERA_PHONE,
        "date_of_birth": "1955-07-22",
        "discharge_date": str(date.today()),
        "cardiac_condition": "mi",
        "language": "hi",
        "nurse_id": nurse_id,
        "family_email": TEST_EMAIL,
        "heart_rate_threshold": 105,
        "call_start_hour": 8,
        "timezone": "UTC",
    }).execute()
    meera_id = meera.data[0]["id"]
    print(f"Meera ID: {meera_id}")

    meera_plan = supabase.table("recovery_plans").insert({
        "patient_id": meera_id,
        "notes": "6 weeks post-MI. Low sodium, no added sugar. 10-min walk once daily.",
        "phase": 4,
    }).execute()
    meera_plan_id = meera_plan.data[0]["id"]

    meera_tasks = [
        # Morning slot
        {"plan_id": meera_plan_id, "task_name": "Neend ki quality (Sleep quality)", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": False, "call_slot": "morning"},
        {"plan_id": meera_plan_id, "task_name": "Seene mein dard (Chest pain)", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": True, "call_slot": "morning"},
        {"plan_id": meera_plan_id, "task_name": "Resting heart rate", "task_type": "vitals", "frequency": "daily", "is_alert_trigger": True, "threshold_value": "105", "call_slot": "morning"},
        # Medication slot
        {"plan_id": meera_plan_id, "task_name": "Metoprolol lena", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        {"plan_id": meera_plan_id, "task_name": "Aspirin lena", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        {"plan_id": meera_plan_id, "task_name": "Clopidogrel lena", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        {"plan_id": meera_plan_id, "task_name": "Ramipril lena", "task_type": "medication", "frequency": "daily", "is_alert_trigger": False, "call_slot": "medication"},
        # Exercise slot
        {"plan_id": meera_plan_id, "task_name": "10-minute walk", "task_type": "exercise", "frequency": "daily", "is_alert_trigger": False, "call_slot": "exercise"},
        {"plan_id": meera_plan_id, "task_name": "Exercise ke baad symptoms", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": True, "call_slot": "exercise"},
        # Evening slot
        {"plan_id": meera_plan_id, "task_name": "Tabiyat kaisi hai (Wellbeing)", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": False, "call_slot": "evening"},
        {"plan_id": meera_plan_id, "task_name": "Khana (Diet adherence)", "task_type": "diet", "frequency": "daily", "is_alert_trigger": False, "call_slot": "evening"},
        {"plan_id": meera_plan_id, "task_name": "Paon mein sujan (Ankle swelling)", "task_type": "symptom_check", "frequency": "daily", "is_alert_trigger": True, "call_slot": "evening"},
    ]
    supabase.table("tasks").insert(meera_tasks).execute()
    print(f"Meera tasks created: {len(meera_tasks)}")

    print("\nDemo patients seeded successfully!")
    print(f"Margaret Chen (EN, CABG): {margaret_id}")
    print(f"Meera Sharma (HI, MI):    {meera_id}")


if __name__ == "__main__":
    seed()
