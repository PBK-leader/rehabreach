# Workflow: Onboard Patient

**Objective:** Nurse creates a new patient record and recovery plan at discharge.

**Inputs required:** Patient demographics, condition, medications, exercise targets, nurse ID.

---

## Steps

1. **Nurse logs in** via the nurse portal (`/app/(nurse)/`)
2. **Nurse fills in patient details:**
   - Name, date of birth, phone number
   - Cardiac condition: `cabg | mi | stent | valve | heart_failure`
   - Preferred language: `en | hi`
   - Family email and phone (for alerts and weekly summary)
   - Heart rate alert threshold (default: 100 bpm)
   - Call start hour (default: 8am)
   - Timezone
3. **Nurse builds the recovery plan** using the plan builder (`/app/(nurse)/plan-builder/`)
   - Selects pre-loaded task templates appropriate for the condition
   - Assigns each task to a call slot: `morning | medication | exercise | evening`
   - Sets `is_alert_trigger = true` for symptom-check tasks
4. **System saves to Supabase:**
   - New row in `patients`
   - New row in `recovery_plans`
   - New rows in `tasks` (one per task)
5. **Verify:** Confirm all tables show the new patient in the Supabase dashboard.

---

## Pre-loaded Task Templates by Condition

**CABG (Bypass)**
- Morning: Sleep quality check, chest pain/sternum wound check, resting heart rate
- Medication: Metoprolol, Aspirin, Atorvastatin, Lisinopril
- Exercise: 15-minute walk twice daily, post-exercise symptoms
- Evening: Energy levels, wound check, fluid intake

**MI (Heart Attack)**
- Morning: Sleep quality, chest pain, resting heart rate
- Medication: Metoprolol, Aspirin, Clopidogrel, Ramipril
- Exercise: 10-minute walk once daily, post-exercise symptoms
- Evening: Appetite, fluid retention, mood/anxiety check

**Stent**
- Same as MI template

**Valve Surgery**
- Morning: Sleep, chest pain, breathlessness
- Medication: Warfarin, Aspirin (as prescribed), Furosemide
- Exercise: Gentle walking 5–10 minutes, shortness of breath during activity
- Evening: Ankle swelling, fatigue level

**Heart Failure**
- Morning: Weight check (fluid retention), breathlessness at rest
- Medication: ACE inhibitor, Beta-blocker, Diuretic, Aldosterone antagonist
- Exercise: Very gentle walking, stopping criteria
- Evening: Ankle/leg swelling, breathlessness when lying flat, fluid intake

---

## Edge Cases

- **Patient has no family contact:** Family email and phone are optional. Weekly email will be skipped.
- **Nurse assigns tasks to wrong slot:** Can be corrected via the plan builder. Tasks can be reassigned at any time.
- **Patient already exists:** Check by phone number before creating a new record to avoid duplicates.
