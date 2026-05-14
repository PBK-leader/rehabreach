# Workflow: Daily Call Cycle

**Objective:** Execute the full 4-call daily check-in cycle for a patient.

**Inputs required:** `patient_id`, `call_slot` (morning | medication | exercise | evening)

---

## Steps

1. **Generate the call script**
   - Triggered automatically when a call is placed.
   - `lib/tools/generateScript.ts` calls Claude (Anthropic API) with the patient's condition, age, language, and task list for the slot.
   - Output: a structured JSON script stored in `call_logs.call_script`.

2. **Place the call**
   - Nurse clicks "Call Now" on the patient detail page, or the API route `POST /api/make-call` is called.
   - `lib/tools/makeCall.ts` creates a call log in Supabase, then dials via Twilio.
   - Voice is Amazon Polly (Joanna for English, Kajal for Hindi) via Twilio's built-in TTS.

3. **Handle the live conversation**
   - Twilio calls `POST /api/call-webhook` to start the call (greeting + first question).
   - Each patient response is captured by Twilio STT and sent to `POST /api/call-webhook/gather`.
   - The gather route saves the response to the transcript and returns the next question directly.
   - If an urgent keyword is detected without a negation, an SMS alert is fired to the nurse.
   - All questions are always asked regardless of patient responses.

4. **Handle no-answer**
   - Twilio status callback hits `POST /api/call-webhook/status`.
   - Status is set to `no_answer` in `call_logs`. No automatic retry (requires manual re-trigger).

5. **Parse the transcript**
   - When the call completes, the status callback awaits `lib/tools/parseCall.ts`.
   - Claude reads the full transcript and extracts: task completion, 1–10 ratings, conclusions, and alert flags.
   - Results are written to `call_logs.parsed_results` and `call_logs.severity_flag`.
   - If auto-parse fails, the nurse can click "Re-parse" on the patient detail page.

6. **Dashboard updates automatically**
   - The nurse portal and family dashboard read directly from `call_logs`. No separate step needed.

---

## Edge Cases

- **Patient doesn't speak:** If Gather times out with no speech, the call advances to the next question automatically.
- **Low-confidence short answers:** Single words like "five" or "yes" score low on STT confidence but are accepted. Re-ask only fires on complete silence.
- **Transcript garbled or empty:** `parseCall` will return an error. The log remains unparsed and the Re-parse button becomes available.
- **Urgent symptom mentioned:** SMS alert fires and call continues. The system never hangs up early.
