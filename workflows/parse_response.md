# Workflow: Parse Call Response

**Objective:** Extract structured compliance data from a call transcript.

**Code:** `lib/tools/parseCall.ts` — called automatically after every completed call, and manually via the Re-parse button.

---

## Steps

1. Read the transcript from `call_logs.transcript` for the given `log_id`.
2. Fetch the task list for that call slot to give Claude context.
3. Send transcript and task list to Claude for structured extraction.
4. Write `parsed_results` (JSON array) and `severity_flag` back to `call_logs`.

---

## Output Structure

Each item in `parsed_results`:

```json
{
  "task_name": "Sleep quality check",
  "completed": true,
  "notes": "Patient slept well",
  "value_reported": "7/10",
  "rating": 7,
  "conclusion": "Sleep rated 7/10 - slept well but woke up once",
  "alert_flag": "normal"
}
```

- `rating` — integer 1–10 for subjective questions, null for binary or numeric tasks
- `conclusion` — one sentence combining the rating and the patient's own description
- `alert_flag` — `urgent`, `watch`, or `normal`

---

## Alert Detection Rules

**Urgent** (any of):
- Chest pain rated 6 or above
- Breathlessness rated 7 or above
- Swelling rated 7 or above
- Any direct cardiac symptom mentioned

**Watch** (any of):
- Sleep rated 1–3
- Fatigue rated 1–3
- Chest pain rated 3–5
- Breathlessness rated 4–6
- Missed 2 or more medications

**Normal:** everything else.

---

## Rating Interpretation

| Symptom | Scale direction | Watch | Urgent |
|---|---|---|---|
| Sleep quality | Higher = better | 1–3 | — |
| Chest pain | Higher = worse | 3–5 | 6+ |
| Breathlessness | Higher = worse | 4–6 | 7+ |
| Fatigue/energy | Higher = better | 1–3 | — |
| Overall wellbeing | Higher = better | 1–3 | — |
| Swelling | Higher = worse | 4–6 | 7+ |

---

## Edge Cases

- **Transcript is empty:** `parseCall` throws. The call log remains unparsed. The Re-parse button becomes visible on the nurse portal.
- **Low-confidence responses in transcript:** Lines marked `[low confidence: X.XX]` are treated as `completed = null` unless clearly interpretable.
- **Patient gives description but no number:** Claude infers the rating from the description where possible, or sets `rating = null`.
