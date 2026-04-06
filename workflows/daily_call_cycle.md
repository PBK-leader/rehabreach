# Workflow: Daily Call Cycle

**Objective:** Execute the full 4-call daily check-in cycle for a patient — from script generation through to dashboard update.

**Inputs required:** `patient_id`, `call_slot` (morning | medication | exercise | evening)

---

## Steps

1. **Generate the call script**
   - Run `tools/generate_script.py --patient_id <id> --call_slot <slot>`
   - Output: `.tmp/script_<patient_id>_<slot>.json`
   - Edge case: If the patient has no tasks for this slot, the script falls back to standard slot questions.

2. **Place the call**
   - Run `tools/make_call.py --patient_id <id> --call_slot <slot>`
   - This synthesises audio via ElevenLabs and dials via Twilio.
   - Always use `--dry_run true` in development.
   - The Twilio webhook handles the live conversation exchange.

3. **Handle no-answer**
   - If Twilio status callback reports `no-answer` or `failed`, the `/api/call-webhook/status` route sets status to `no_answer`.
   - Wait 30 minutes, then run `tools/retry_call.py --log_id <id>`.

4. **Parse the transcript**
   - After call completes, run `tools/parse_call.py --log_id <id>`
   - Reads the transcript from `call_logs.transcript`, sends to Claude for structured parsing.
   - Writes `parsed_results` (JSON array) and `severity_flag` back to `call_logs`.

5. **Update the dashboard**
   - Run `tools/update_dashboard.py --log_id <id>`
   - If `severity_flag = urgent`, this triggers `tools/send_alert.py` immediately.
   - Dashboard reads from `call_logs` directly — no separate write needed.

---

## Edge Cases

- **Patient doesn't speak English or Hindi:** Language is set on the patient record. If blank, defaults to English. Use `tools/detect_language.py` to update it from early call audio.
- **Twilio rate limits:** Max 1 outbound call per patient per slot. Never retry more than once.
- **ElevenLabs synthesis failure:** Catch HTTP errors. If synthesis fails, abort the call and log status as `missed` with notes.
- **Transcript garbled/empty:** `parse_call.py` will raise an error. Log and skip — do not mark as completed.
- **Call outside 7am–9pm:** `retry_call.py` checks hours before dialling. Skip and log.

---

## Bilingual Notes

- The script language is derived from `patients.language`.
- ElevenLabs uses separate voice IDs per language — set both in `.env`.
- All steering phrases and confirmations are generated in the same language as the patient.
