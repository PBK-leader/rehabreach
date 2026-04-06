# Workflow: Weekly Family Email

**Objective:** Send a warm, plain-language weekly compliance summary to the patient's family contact.

**Tool:** `tools/send_weekly_email.py`

**Trigger:** Every Sunday, run once per active patient who has a `family_email` set.

---

## Steps

1. Fetch all `call_logs` for the patient from the past 7 days.
2. Compute stats: compliance rate, medication adherence days, exercise days, alert count.
3. Build a prompt for Claude with these stats and patient first name.
4. Claude generates the HTML email body.
5. Send via Resend API to `patients.family_email`.

---

## Required Content

- Overall compliance rate: % of calls completed out of total scheduled
- Medication adherence streak: consecutive days all meds confirmed taken
- Exercise completion rate: days target met vs. 7 total days
- Any alerts that fired (watch or urgent) and their resolution status
- A warm personalised encouragement note using the patient's first name

---

## Tone Rules (enforced in prompt)

- Warm, simple, non-clinical. No jargon.
- Never lead with bad news without immediately providing context and next steps.
- If all stats are positive: be warmly encouraging.
- If there were urgent alerts: acknowledge them, note that the care team has been notified, and reassure.
- Keep paragraphs short (2–3 sentences).
- Use the patient's first name throughout.

---

## Edge Cases

- **No family email on record:** Skip silently. Log skipped patients.
- **No calls completed this week:** Send the email but acknowledge the patient was unreachable and the care team has been notified.
- **Patient was discharged or plan ended:** Out of scope — this platform does not currently track discharge status. Continue sending until manually removed.
- **Resend API failure:** Retry once after 60 seconds. If still failing, log the error but do not throw — the failure is non-critical.

---

## Subject Line Format

`Weekly update: [First Name]'s recovery — week ending DD Mon YYYY`

## Sender

`from: RehabReach <noreply@rehabreach.app>`
