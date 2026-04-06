# Workflow: Missed Call Protocol

**Objective:** Handle unanswered calls correctly — retry once, escalate if needed, never exceed call limits.

---

## Steps

1. Twilio status callback fires → `/api/call-webhook/status` sets `call_logs.status = no_answer`
2. Wait exactly 30 minutes
3. Run `tools/retry_call.py --log_id <original_log_id>`
4. If retry also fails: set `status = missed`
5. Severity escalation:
   - 2 consecutive missed slots → `severity_flag = watch`
   - 3 consecutive missed slots → `severity_flag = urgent` + run `tools/send_alert.py --reason 3_consecutive_missed_calls`

---

## Hard Constraints

- **Maximum 2 call attempts per scheduled slot.** No third attempts.
- **Never call outside 7am–9pm** in the patient's local timezone (`patients.timezone`).
- `retry_call.py` checks the hour before dialling and skips if outside the window.

---

## Counting Consecutive Misses

`retry_call.py` queries `call_logs` ordered by `call_slot_scheduled DESC` and counts consecutive `no_answer` / `missed` statuses from the most recent entry. Any `completed` or `alert_fired` status resets the count.

---

## Family Notification

Consecutive misses appear in the weekly family email as part of the alert summary. There is no immediate email to family — only the nurse SMS on `urgent`.

---

## Edge Cases

- **Patient answers but hangs up immediately:** Twilio reports `completed`. Log as `status = completed` with an empty/short transcript. `parse_call.py` will set `completed = null` for all tasks.
- **Voicemail detected:** Twilio `machine_detection = Enable` will mark as voicemail. Treat as `no_answer` — do not leave a voicemail.
- **Patient calls back:** Out of scope for this platform — the AI does not accept inbound calls.
