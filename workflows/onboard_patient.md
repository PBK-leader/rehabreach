# Workflow: Onboard Patient

**Objective:** Nurse creates a new patient record and recovery plan at discharge.

**Inputs required:** Patient demographics, cardiac condition, nurse fills form at `/plan-builder`.

---

## Steps

1. **Nurse visits** `/plan-builder` in the nurse portal.
2. **Nurse fills in patient details:**
   - Full name, phone number (in international format e.g. +91XXXXXXXXXX)
   - Cardiac condition: `cabg | mi | stent | valve | heart_failure`
   - Preferred language: `en | hi`
   - Date of birth, discharge date
   - Family email and phone (optional — used for alerts and weekly summary email)
   - Heart rate alert threshold (default: 100 bpm)
   - Call start hour (default: 8am)
3. **Select condition** — a pre-built task template loads automatically with condition-specific medications, exercises, and symptom checks.
4. **Nurse reviews and edits tasks** on step 2, then clicks "Save patient and plan."
5. **`savePatient` server action** inserts rows into `patients`, `recovery_plans`, and `tasks` in Supabase.
6. **Redirected** to the patient detail page at `/patients/[id]`.

---

## Editing an existing patient

- From the patient detail page, click "Edit plan."
- The plan builder pre-fills all existing patient data and tasks.
- On save, `updatePatient` server action updates the patient record and replaces all tasks.

---

## Pre-loaded Task Templates by Condition

**CABG (Bypass)**
- Morning: Sleep quality check, chest pain check, resting heart rate
- Medication: Metoprolol, Aspirin 75mg, Atorvastatin, Lisinopril
- Exercise: 15-minute walk (twice daily), post-exercise symptoms
- Evening: Overall wellbeing, diet adherence (low sodium), ankle/leg swelling check

**MI (Heart Attack)**
- Morning: Sleep quality check, chest pain check, resting heart rate
- Medication: Metoprolol, Aspirin 75mg, Clopidogrel, Ramipril
- Exercise: 10-minute walk, post-exercise symptoms
- Evening: Overall wellbeing, diet adherence, ankle/leg swelling check

**Stent**
- Morning: Chest pain check, resting heart rate
- Medication: Aspirin 75mg, Clopidogrel
- Exercise: 10-minute walk, post-exercise symptoms
- Evening: Overall wellbeing

**Valve Surgery**
- Morning: Breathlessness at rest, resting heart rate
- Medication: Warfarin, Furosemide
- Exercise: 5-10 minute gentle walk, breathlessness during activity
- Evening: Ankle swelling, fatigue level

**Heart Failure**
- Morning: Breathlessness at rest, weight check (fluid retention)
- Medication: ACE inhibitor, Beta-blocker, Diuretic
- Exercise: Gentle walking
- Evening: Breathlessness when lying flat, ankle/leg swelling, fluid intake check

---

## Edge Cases

- **Patient has no family contact:** Family email and phone are optional. Weekly email will be skipped if no email is set.
- **Duplicate patient:** Check by phone number before creating a new record to avoid duplicates.
- **Wrong tasks assigned:** Edit plan at any time via the "Edit plan" button on the patient detail page.
