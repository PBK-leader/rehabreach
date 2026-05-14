# Workflow: Missed Call Protocol

**Objective:** Handle unanswered calls correctly.

---

## What happens on no-answer

1. Twilio status callback fires to `POST /api/call-webhook/status`.
2. If `CallStatus` is `no-answer`, `busy`, or `AnsweredBy` is `machine_start`, the log is set to `status = no_answer`.
3. No automatic retry — retry must be triggered manually by the nurse clicking "Call Now" again.

---

## Hard Constraints

- **Maximum 1 active call attempt per trigger.** The nurse decides when to retry.
- Voicemail detection: if Twilio reports `machine_start`, the call is logged as `no_answer`. No voicemail is left.
- **Patient calls back:** Out of scope — the system does not accept inbound calls.

---

## Consecutive missed calls

Consecutive misses are visible on the nurse portal via the 7-day heatmap (grey squares = no call, amber = missed). There is no automatic escalation for missed calls in the current prototype — the nurse reviews the heatmap and decides when to follow up.

---

## Edge Cases

- **Patient answers but hangs up immediately:** Twilio reports `completed`. Logged as completed with a short or empty transcript. Claude parse will set `completed = null` for all tasks.
- **Patient in different timezone:** Call timing is controlled by the nurse manually. The `call_start_hour` and `timezone` fields on the patient record are stored for future scheduled call support.
