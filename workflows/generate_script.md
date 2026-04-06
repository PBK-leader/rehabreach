# Workflow: Generate Call Script

**Objective:** Turn a patient's task list for a given call slot into a structured bilingual call script.

**Tool:** `tools/generate_script.py`

---

## Steps

1. Fetch the patient record and active recovery plan from Supabase.
2. Fetch all tasks assigned to the requested `call_slot`.
3. Build a prompt for Claude with patient name, age, condition, language, and task list.
4. Claude returns structured JSON: greeting, exchanges (one per task), closing.
5. Script is saved to `.tmp/script_<patient_id>_<slot>.json`.
6. JSON is returned for the calling layer to consume.

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
      "confirmation_echo": "...",
      "alert_trigger": false,
      "alert_threshold": null,
      "urgent_response": null
    }
  ],
  "closing": "..."
}
```

---

## Pacing Rules (enforced in prompt)

- Maximum 1 question per exchange.
- `[pause]` inserted every 2 sentences.
- Sentences under 12 words wherever possible.
- Confirmation echo before moving to the next question.
- Alert-trigger tasks include an `urgent_response` phrase for immediate escalation.

---

## Language Notes

- Language is read from `patients.language` (`en` or `hi`).
- The entire script (greeting, questions, echoes, closing) is generated in the same language.
- Hindi script uses Romanised Hindi (Hinglish) for TTS compatibility with ElevenLabs.
- Do not mix languages within a single script exchange.

---

## Edge Cases

- **No tasks for this slot:** Script falls back to standard slot questions (sleep, chest pain, etc.) based on `SLOT_FOCUS` in the tool.
- **Claude returns malformed JSON:** Retry once. If still failing, abort and log the error — do not attempt to call with a broken script.
- **ElevenLabs character limit:** Keep total script under 5,000 characters. If tasks are many, consolidate questions.
