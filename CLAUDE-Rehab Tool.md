# CLAUDE.md
## Critical operating rule
Build only ONE phase at a time. After completing each phase, 
STOP and wait for the user to verify it works before proceeding 
to the next phase. Never auto-proceed across phases.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

This is **RehabReach** — a cardiac post-surgery rehabilitation platform that uses AI-powered voice calls to help elderly patients follow their recovery plan at home, and gives nurses, doctors, and family members a live compliance dashboard.

It is built on the **WAT framework** (Workflows, Agents, Tools), which separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable and safe for a healthcare context.

---

## Product Overview

**The problem:** Elderly cardiac patients discharged from hospital are expected to follow complex daily recovery plans alone — medications, exercises, diet, symptom monitoring. Most have no dedicated caregiver. Non-compliance is the leading cause of readmission.

**The solution:** RehabReach calls patients on their regular phone — no app, no smartphone needed. A gentle AI voice checks in 4 times a day, asks simple questions, listens to free-form responses, and steers the conversation if the patient goes off-topic. All responses are parsed, logged, and surfaced to nurses and family on a live dashboard. Urgent cardiac symptoms trigger an immediate SMS alert to the care team.

**Target users:**
- Nurses / care coordinators — create and manage patient recovery plans at discharge
- Patients — elderly, not tech-savvy, receive calls on their regular phone
- Family / caregivers — monitor progress via dashboard and weekly email summary

**Geography:** Global — market-agnostic. No region-specific regulations hardcoded.

**Stage:** Demo / research project. No billing or subscription logic required.

---

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases
- Written in plain language, the same way you'd brief a clinical team member

**Layer 2: Agents (The Decision-Maker)**
- This is your role. You're responsible for intelligent coordination.
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- You connect intent to execution without trying to do everything yourself
- Example: To make a call, don't attempt it directly. Read `workflows/make_call.md`, gather the required inputs (patient_id, call_type), then execute `tools/make_call.py`

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work
- API calls, data transformations, Supabase queries, Twilio calls, ElevenLabs voice synthesis
- Credentials and API keys are stored in `.env` — never anywhere else
- These scripts are consistent, testable, and safe to re-run

**Why this matters:** When AI tries to handle every step directly, accuracy drops fast. If each step is 90% accurate, five chained steps leave you at 59% success. By offloading execution to deterministic scripts, the agent stays focused on orchestration and decision-making — especially critical in a healthcare setting where errors have real consequences.

---

## Project Architecture

This project uses a **hybrid stack**:

- **Frontend + API routes:** Next.js (TypeScript) — nurse portal, family dashboard
- **Backend tool scripts:** Python — all API integrations (Twilio, ElevenLabs, Anthropic, Supabase)
- **Database:** Supabase (Postgres) — patients, recovery plans, tasks, call logs
- **Voice calls:** Twilio — outbound dialing, speech recognition, retry logic
- **Voice synthesis:** ElevenLabs — text-to-speech with elderly-optimised voice
- **AI brain:** Anthropic Claude API — script generation, free-form response parsing, alert detection
- **Email:** Resend — weekly progress summary emails to family
- **Hosting:** Vercel (frontend); Python tools run server-side or via cron

Next.js API routes are thin wrappers that invoke Python tool scripts. Never put API credentials or business logic directly in frontend components.

---

## File Structure

```
app/                          # Next.js app directory
  (nurse)/                    # Nurse / care coordinator portal
    patients/                 # Patient list and detail views
    plan-builder/             # Cardiac recovery plan creation UI
  (family)/                   # Family / caregiver dashboard
    dashboard/                # Live compliance view + alert history
  api/                        # Next.js API routes (thin — call Python tools)
    generate-script/
    make-call/
    call-webhook/
    parse-call/
    alert/
    weekly-email/

tools/                        # Python scripts for deterministic execution
  generate_script.py          # Anthropic API: task list → structured call script
  make_call.py                # ElevenLabs synthesis + Twilio outbound call
  retry_call.py               # Re-attempts missed call once after 30 minutes
  parse_call.py               # Anthropic API: transcript → structured compliance JSON
  send_alert.py               # Twilio SMS: cardiac flag → immediate nurse/doctor alert
  update_dashboard.py         # Writes parsed results to Supabase call_logs
  send_weekly_email.py        # Resend API: weekly summary email to family
  sync_schedule.py            # Schedules daily calls from active recovery plans
  detect_language.py          # Detects patient language preference (English / Hindi)

workflows/                    # Markdown SOPs — read before running any tool
  daily_call_cycle.md         # End-to-end: plan → script → call → parse → dashboard
  cardiac_alert_protocol.md   # When and how to escalate, what counts as urgent
  missed_call_protocol.md     # Retry logic, logging, family notification on no-answer
  onboard_patient.md          # Nurse creates patient + recovery plan at discharge
  generate_script.md          # Turning a cardiac task list into a bilingual call script
  parse_response.md           # Interpreting free-form speech, steering off-topic replies
  weekly_email.md             # Generating and sending the family summary email

.env                          # API keys (never commit)
.env.example                  # Template — all required keys listed without values
```

---

## Environment Variables Required

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID_EN=        # English voice — gentle, slow, warm
ELEVENLABS_VOICE_ID_HI=        # Hindi voice — gentle, slow, warm

# Anthropic
ANTHROPIC_API_KEY=

# Resend (weekly email)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NURSE_ALERT_SMS_NUMBER=        # SMS target when cardiac flag fires
```

---

## Voice and Language Design

**Tone:** Gentle, slow-paced, warm. Designed for elderly patients who may have hearing difficulty or cognitive fatigue post-surgery. No medical jargon. Short sentences. Natural pauses between questions.

**Languages supported:** English and Hindi. The patient's preferred language is set by the nurse at onboarding and stored on the patient record. All call scripts are generated in the correct language by the Anthropic prompt. ElevenLabs uses separate voice IDs per language — set both in `.env`.

**Response handling:** Patients can speak freely — they are not constrained to yes/no. The AI listens to the full response and steers back on track if the patient goes off-topic, wanders, or gives an unclear answer.

Example English steering phrases:
- "That's okay — let's just check one thing. Did you manage to take your morning tablet today?"
- "I understand. I just want to make sure — did you feel any chest pain or discomfort today?"

Example Hindi steering phrases:
- "Koi baat nahi — bas ek cheez poochni thi. Kya aapne aaj apni subah ki dawa li?"
- "Samajh gaya/gayi. Bas confirm karna tha — kya aapko aaj seene mein dard ya takleef hui?"

Never cut a patient off abruptly. Always acknowledge before redirecting.

**Pacing rules for script generation:**
- Maximum 1 question per exchange
- Pause cues inserted every 2 sentences: `[pause]`
- Sentences kept under 12 words wherever possible
- Confirmation echo before moving to next question:
  - English: "Great, I've noted that."
  - Hindi: "Theek hai, maine note kar liya."

---

## Missed Call Protocol

If a patient does not answer a scheduled call:

1. Log the attempt in `call_logs` with `status: no_answer`
2. Wait exactly 30 minutes
3. Run `tools/retry_call.py` for a single retry attempt
4. If retry also fails: log as `status: missed`
5. Set `severity_flag` to `watch` after 2 consecutive missed call slots; `urgent` after 3
6. On `urgent`: trigger `tools/send_alert.py` to notify the nurse immediately

Never attempt more than 2 calls per scheduled slot. Never call outside 7am–9pm in the patient's local timezone.

---

## Cardiac-Specific Call Schedule

Each patient receives up to 4 calls per day. The nurse sets the actual schedule at onboarding; these are the defaults.

| Call | Default time | Duration | Focus |
|------|-------------|----------|-------|
| Morning check-in | 8:00am | ~3 min | Sleep quality, chest pain, resting heart rate |
| Medication check | 10:00am | ~2 min | All prescribed cardiac medications |
| Exercise check | 2:00pm | ~3 min | Walking completed, duration, post-exercise symptoms |
| Evening wrap-up | 7:00pm | ~2 min | Overall wellbeing, diet adherence, leg/ankle swelling |

**Broad cardiac scope:** The platform supports any post-cardiac-event patient — bypass (CABG), heart attack (MI), stent placement, valve surgery, heart failure. The nurse selects the patient's condition at onboarding; the AI tailors question language accordingly, but the core 4-call structure remains consistent across all types.

---

## Cardiac Alert Protocol

This is the most safety-critical part of the system. Read `workflows/cardiac_alert_protocol.md` before touching any alert-related code.

**Immediate alert triggers** — end call early + SMS nurse immediately:
- Patient reports chest pain or pressure of any kind
- Patient reports shortness of breath at rest
- Heart rate reported above nurse-set threshold (default: 100 bpm resting)
- Dizziness, near-fainting, or loss of balance after exercise
- Patient sounds severely confused, distressed, or unresponsive mid-call

**Watch triggers** — flag in dashboard, no call interruption:
- Missed 2+ medications in the same day
- Ankle or leg swelling reported
- Poor sleep reported 3+ nights in a row
- Exercise not completed 2+ consecutive days
- 2+ consecutive missed calls (no answer)

**When an immediate alert fires, the AI must say:**

English:
> "I'm going to flag this for your care team right away. Please rest and keep your phone close. Someone will be in touch very soon."

Hindi:
> "Main abhi aapki care team ko batane wala/wali hoon. Kripya aaram karein aur apna phone paas rakhein. Koi bahut jald aapse sampark karega."

Then the call ends and `tools/send_alert.py` fires immediately.

Never minimise, delay, or skip escalation on a cardiac symptom report. When in doubt, escalate.

---

## Weekly Family Email

Every Sunday, `tools/send_weekly_email.py` sends a plain-language summary via Resend to the family contact on file.

Required content:
- Overall compliance rate for the week (% of tasks completed across all calls)
- Medication adherence streak (consecutive days all meds confirmed taken)
- Exercise completion rate (days target met vs. total days)
- Any alerts that fired during the week and their resolution status
- A warm, personalised encouragement note using the patient's first name

Tone: warm, simple, and non-alarming unless an unresolved urgent alert exists. Avoid clinical jargon. The family recipient may have no medical background. Never send a weekly email that leads with bad news without immediately following with context and next steps.

---

## Database Schema (Supabase)

```sql
patients (
  id                   uuid PRIMARY KEY,
  name                 text NOT NULL,
  phone                text NOT NULL,
  date_of_birth        date,
  discharge_date       date,
  cardiac_condition    text,        -- 'cabg' | 'mi' | 'stent' | 'valve' | 'heart_failure'
  language             text DEFAULT 'en',  -- 'en' | 'hi'
  nurse_id             uuid REFERENCES users(id),
  family_email         text,
  family_phone         text,
  heart_rate_threshold int DEFAULT 100,
  call_start_hour      int DEFAULT 8,
  timezone             text DEFAULT 'UTC',
  created_at           timestamptz DEFAULT now()
)

recovery_plans (
  id           uuid PRIMARY KEY,
  patient_id   uuid REFERENCES patients(id),
  created_at   timestamptz DEFAULT now(),
  notes        text,
  phase        int          -- 3 = early outpatient, 4 = maintenance
)

tasks (
  id                uuid PRIMARY KEY,
  plan_id           uuid REFERENCES recovery_plans(id),
  task_name         text NOT NULL,
  task_type         text,   -- 'medication' | 'exercise' | 'symptom_check' | 'diet' | 'vitals'
  frequency         text,   -- 'daily' | 'twice_daily' | 'as_needed'
  is_alert_trigger  boolean DEFAULT false,
  threshold_value   text,   -- e.g. '100' for heart rate bpm limit
  call_slot         text    -- 'morning' | 'medication' | 'exercise' | 'evening'
)

call_logs (
  id                    uuid PRIMARY KEY,
  patient_id            uuid REFERENCES patients(id),
  call_type             text,        -- 'morning' | 'medication' | 'exercise' | 'evening'
  call_slot_scheduled   timestamptz,
  called_at             timestamptz,
  status                text,        -- 'completed' | 'no_answer' | 'missed' | 'alert_fired'
  language              text,        -- 'en' | 'hi'
  transcript            text,
  parsed_results        jsonb,       -- [{task_name, completed, notes}]
  severity_flag         text DEFAULT 'normal',  -- 'normal' | 'watch' | 'urgent'
  retry_of              uuid REFERENCES call_logs(id)  -- set if this is a retry attempt
)

users (
  id     uuid PRIMARY KEY,
  email  text UNIQUE NOT NULL,
  role   text        -- 'nurse' | 'doctor' | 'family'
)
```

---

## How to Operate

**1. Read the workflow before touching a tool**
Every tool has a corresponding workflow. Read it first — it contains edge cases, bilingual handling notes, rate limit constraints, and clinical context.

**2. Look for existing tools before building new ones**
Check `tools/` before creating a new script. Only build new tools when nothing exists for the task.

**3. Handle errors carefully — this is healthcare**
When a tool fails:
- Read the full error and stack trace
- For failures involving paid API calls (Twilio, ElevenLabs), stop and confirm with the user before retrying
- Document rate limits, timing quirks, and unexpected behaviour in the corresponding workflow
- Never silently swallow errors in tools that touch patient data or alert logic

**4. Keep workflows current**
When you discover a better approach, a new constraint, or a recurring failure pattern, update the workflow. Don't create or overwrite workflows without asking — these are persistent clinical SOPs.

**5. Never store PII in `.tmp/` or commit it**
Patient names, phone numbers, and call transcripts are sensitive. Keep them in Supabase only. `.tmp/` is for intermediate files with no identifying information.

**6. Always use `--dry_run` for paid API calls during development**
```bash
python tools/make_call.py --patient_id abc123 --dry_run true
python tools/send_alert.py --patient_id abc123 --dry_run true
python tools/send_weekly_email.py --patient_id abc123 --dry_run true
```

---

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:

1. Identify what broke
2. Fix the tool
3. Verify the fix works (`--dry_run` if it touches APIs)
4. Update the workflow with the new approach
5. Move on with a more robust system

---

## Demo Patient Profiles

Use these two fictional patients for all testing and demos. Having one English and one Hindi patient lets you demonstrate bilingual capability live.

**English demo patient:**
```
Name:               Margaret Chen
Age:                76
Condition:          3 weeks post-CABG
Language:           English
Phone:              Your own number during testing
Medications:        Metoprolol, Aspirin, Atorvastatin, Lisinopril
Exercise target:    15-minute walk, twice daily
Heart rate alert:   100 bpm resting
Diet:               Low sodium, 1.5L fluid restriction
Family email:       Your own email during testing
```

**Hindi demo patient:**
```
Name:               Meera Sharma
Age:                71
Condition:          6 weeks post-MI (heart attack)
Language:           Hindi
Phone:              Your own number during testing
Medications:        Metoprolol, Aspirin, Clopidogrel, Ramipril
Exercise target:    10-minute walk, once daily
Heart rate alert:   105 bpm resting
Diet:               Low sodium, no added sugar
Family email:       Your own email during testing
```

---

## Build Phases

| Phase | What gets built | How you verify |
|-------|----------------|----------------|
| 1 — Setup | Node, Python, all API accounts, `.env` filled | App runs at `localhost:3000` |
| 2 — Database | Supabase schema created, both demo patients seeded | All tables visible in Supabase dashboard |
| 3 — Nurse portal | Login, add patient, cardiac plan builder with pre-loaded task templates | Create Margaret, add 3 tasks, confirm in Supabase |
| 4 — Script generator | `generate_script.py` — tasks → bilingual call script JSON | Hit API route, see JSON output with real cardiac questions in correct language |
| 5 — Voice call system | `make_call.py` + `retry_call.py` + `send_alert.py` | Call your own phone, hear gentle AI voice ask a cardiac question, test 30-min retry, test alert SMS |
| 6 — Response parsing | `parse_call.py` + `update_dashboard.py` | Make test call, answer freely, check `call_logs` in Supabase for parsed compliance data |
| 7 — Family dashboard + email | Compliance dashboard + `send_weekly_email.py` | See today's tasks marked complete/missed, receive weekly summary email to your inbox |
