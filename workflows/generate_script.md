# Workflow: Generate Call Script

**Objective:** Turn a patient's task list for a given call slot into a structured call script.

**Code:** `lib/tools/generateScript.ts` — called automatically inside `makeCall` before every call.

---

## Steps

1. Fetch the patient record from Supabase (name, age, condition, language).
2. Fetch the most recent recovery plan and all tasks assigned to the requested `call_slot`.
3. Build a prompt for Claude with patient details and task list.
4. Claude returns structured JSON: greeting, exchanges (one per task), closing.
5. Script is stored in `call_logs.call_script` in Supabase for the webhook to read during the live call.

---

## Script Structure

```json
{
  "language": "en",
  "call_slot": "morning",
  "greeting": "...",
  "exchanges": [
    {
      "task_name": "...",
      "question": "...",
      "hints": ["yes", "no", "one", "two", "five", "seven", "ten", "good", "bad"],
      "confirmation_echo": "...",
      "alert_trigger": false,
      "urgent_response": null
    }
  ],
  "closing": "..."
}
```

---

## Question Format Rules

- Maximum 1 question per exchange.
- For subjective symptom questions (sleep, chest pain, breathlessness, fatigue, swelling): ask for a 1–10 rating AND a brief description in a single question. Example: "On a scale of 1 to 10, how well did you sleep? 1 means very poor and 10 means excellent. And in a few words, how would you describe it?"
- For binary tasks (medications taken, walk completed): simple yes/no question.
- For measurable vitals (heart rate, weight): ask for the specific number.
- Hints array includes numbers one through ten and common descriptors for rating questions.
- Confirmation echo plays before moving to the next question.

---

## Language Notes

- Language is read from `patients.language` (`en` or `hi`).
- The entire script is generated in the same language.
- Voice is Amazon Polly: Joanna for English, Kajal for Hindi (via Twilio TTS — no separate TTS API needed).

---

## Edge Cases

- **No tasks for this slot:** Script falls back to standard slot questions based on `SLOT_FOCUS` in `generateScript.ts`.
- **Claude returns malformed JSON:** `JSON.parse` will throw. The call will not be placed and an error is returned to the nurse.
