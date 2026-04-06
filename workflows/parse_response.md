# Workflow: Parse Call Response

**Objective:** Extract structured compliance data from a free-form call transcript.

**Tool:** `tools/parse_call.py`

---

## Steps

1. Read the transcript from `call_logs.transcript` for the given `log_id`.
2. Fetch the task list for that call slot to give Claude context.
3. Send transcript + task list to Claude for structured extraction.
4. Write `parsed_results` (JSON array) and `severity_flag` back to `call_logs`.

---

## Output Structure

Each item in `parsed_results`:

```json
{
  "task_name": "Take Metoprolol 50mg",
  "completed": true,
  "notes": "Patient confirmed taking with breakfast",
  "value_reported": null,
  "alert_flag": "normal"
}
```

`alert_flag` values:
- `urgent` — cardiac symptom detected
- `watch` — mild concern (missed meds, swelling, poor sleep, missed exercise)
- `normal` — no issues

---

## Handling Off-Topic Responses

Elderly patients frequently go off-topic — telling stories, asking questions, or wandering.
- Extract what you can from the response.
- Set `completed = null` if the question was never answered.
- Add a brief note: `"notes": "Patient went off-topic; question not answered"`
- Do not penalise patients for off-topic responses in severity flags.

---

## Unclear or Ambiguous Answers

- "I think so" → `completed = true` with note `"Uncertain confirmation"`
- "I'm not sure" → `completed = null`
- "No... well, maybe a little" → `completed = null` with note `"Ambiguous"`

---

## Alert Detection Rules

- **Urgent:** Any mention of chest pain, pressure, tightness, shortness of breath at rest, dizziness, near-fainting, severe confusion.
- **Watch:** Missing 2+ medications, ankle/leg swelling, poor sleep 3+ nights, exercise missed 2+ days. These require cross-log context that `parse_call.py` does not handle — the dashboard surfaces these by aggregating across logs.

---

## Edge Cases

- **Transcript is empty or very short:** Log error. Do not mark as completed. Keep status as `no_answer`.
- **Language detection mismatch:** If the transcript appears to be in a different language than expected, note it but still attempt parsing.
- **Sensitive information shared:** Patients may share personal details. Do not store identifying information in `notes` beyond what's clinically relevant.
