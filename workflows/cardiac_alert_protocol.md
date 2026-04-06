# Workflow: Cardiac Alert Protocol

**⚠️ This is the most safety-critical workflow. Read fully before touching any alert code.**

**Objective:** Correctly identify, escalate, and log urgent cardiac symptoms during calls.

---

## Immediate Alert Triggers (end call + SMS nurse NOW)

The following must trigger an immediate alert with no delay:

1. Patient reports **chest pain or pressure of any kind**
2. Patient reports **shortness of breath at rest**
3. Heart rate reported **above patient's threshold** (default: 100 bpm resting)
4. Patient reports **dizziness, near-fainting, or loss of balance after exercise**
5. Patient sounds **severely confused, distressed, or unresponsive** mid-call

**What the AI must say before ending the call:**

*English:*
> "I'm going to flag this for your care team right away. Please rest and keep your phone close. Someone will be in touch very soon."

*Hindi:*
> "Main abhi aapki care team ko batane wala/wali hoon. Kripya aaram karein aur apna phone paas rakhein. Koi bahut jald aapse sampark karega."

Then the call ends and `tools/send_alert.py --patient_id <id> --reason cardiac_symptom --log_id <id>` fires.

---

## Watch Triggers (flag in dashboard only — no call interruption)

- Missed 2+ medications in the same day
- Ankle or leg swelling reported
- Poor sleep reported 3+ nights in a row
- Exercise not completed 2+ consecutive days
- 2+ consecutive missed calls (no answer)

`parse_call.py` sets `severity_flag = watch` for these. The dashboard highlights them.

---

## Rules

- **Never minimise a cardiac symptom.** If the patient says "a little discomfort," treat it as urgent.
- **Never delay escalation** to avoid disrupting the call. The call ends, the alert fires.
- **Never skip escalation** on the assumption the nurse is already aware.
- **When in doubt, escalate.** A false positive alert is far safer than a missed one.
- **The AI is not a diagnostic tool.** It does not assess severity — it escalates immediately.

---

## Implementation in parse_call.py

`parse_call.py` checks each parsed result for `alert_flag = "urgent"`. If any result has this flag:
1. Overall `severity_flag` is set to `urgent` on the `call_logs` row.
2. `update_dashboard.py` sees the flag and calls `send_alert.py`.

The alert path in the live call (Twilio webhook) must be handled in `/api/call-webhook` — if the patient mentions a trigger keyword mid-conversation, the webhook must:
1. Speak the closing alert phrase (in the correct language).
2. Hang up the call.
3. POST to `/api/alert` with `{ patient_id, log_id, reason: "cardiac_symptom" }`.

---

## SMS Alert Format

Sent to `NURSE_ALERT_SMS_NUMBER` from `tools/send_alert.py`:

> URGENT: [Patient Name] reported a potential cardiac symptom during their [time] check-in call. Please contact them immediately. Phone: [phone number]

---

## Audit Trail

Every alert fired is permanently recorded via `severity_flag = urgent` on the `call_logs` row. It cannot be downgraded. The weekly email will surface all urgent alerts to the family.
