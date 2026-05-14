# Workflow: Weekly Family Email

**Objective:** Send a plain-language weekly compliance summary to the patient's family contact.

**Code:** `lib/tools/sendWeeklyEmail.ts` — triggered via `POST /api/weekly-email` (requires `INTERNAL_API_SECRET`).

**Trigger:** Must be called manually or via an external cron job. There is no built-in scheduler in the current prototype.

---

## Steps

1. Fetch the patient record from Supabase. Skip if no `family_email` is set.
2. Fetch all `call_logs` for the past 7 days.
3. Compute stats: compliance rate, medication adherence days, exercise days, urgent and watch alert counts.
4. Build a prompt for Claude with these stats and the patient's first name.
5. Claude generates an HTML email body.
6. Send via Resend API to `patients.family_email`.

---

## Tone Rules (enforced in prompt)

- Warm, simple, non-clinical. No medical jargon.
- Never lead with bad news without immediately providing context and next steps.
- If all stats are positive: be warmly encouraging.
- If there were urgent alerts: acknowledge them, note that the care team has been notified, and reassure.
- Keep paragraphs short (2–3 sentences).
- Use the patient's first name throughout.

---

## Subject Line Format

`Weekly update: [First Name]'s recovery — week ending DD Mon YYYY`

## Sender

`RehabReach <noreply@rehabreach.app>` (requires a verified sender domain in Resend)

---

## Edge Cases

- **No family email on record:** Returns `{ skipped: true }`. No email is sent.
- **Resend API failure:** Error is thrown and returned to the caller.
- **No calls completed this week:** Email is still sent with zero compliance stats.
