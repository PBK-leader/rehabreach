# RehabReach

AI-powered post-surgery rehabilitation follow-up platform for cardiac care teams.

RehabReach automatically calls discharged patients four times a day to check on their medication adherence, sleep quality, chest pain, exercise completion, and general wellbeing. A nurse sets up each patient and their care plan. The system handles the rest: generating personalised call scripts, placing calls, transcribing responses, parsing compliance data, and alerting the care team if anything urgent is reported.

---

## Live Demo

| Portal | URL |
|---|---|
| Landing page | `/` |
| Nurse portal | `/patients` |
| Add / edit patient | `/plan-builder` |
| Family dashboard | `/dashboard` |

No login required for the demo.

---

## How it works

1. **Nurse adds a patient** — name, phone number, cardiac condition, and a care plan with daily tasks assigned to four call slots (morning, medication, exercise, evening).
2. **Call is placed** — Claude (Anthropic) generates a personalised call script. Twilio dials the patient. Amazon Polly reads the questions aloud in English or Hindi.
3. **Patient answers** — Twilio captures speech and sends it back to the server question by question. Urgent symptom keywords trigger an immediate SMS alert to the nurse.
4. **AI parses the transcript** — Claude reads the full transcript after the call and extracts structured results: whether each task was completed, a 1–10 rating for subjective symptoms, and a one-sentence conclusion.
5. **Dashboards update** — The nurse portal and family dashboard display ratings, conclusions, compliance heatmaps, and any urgent flags.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (Postgres) |
| Phone calls | Twilio Programmable Voice |
| Text-to-speech | Amazon Polly via Twilio (Joanna EN, Kajal HI) |
| AI script generation | Anthropic Claude API |
| AI transcript parsing | Anthropic Claude API |
| Email (weekly summary) | Resend |
| Deployment | Vercel |

---

## Environment variables

Create a `.env.local` file using `.env.example` as a template:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio outbound phone number |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `INTERNAL_API_SECRET` | Secret for guarding internal API routes |
| `NEXT_PUBLIC_APP_URL` | Public deployment URL (e.g. `https://rehabreach.vercel.app`) |
| `NURSE_ALERT_SMS_NUMBER` | Phone number to SMS on urgent alerts |
| `RESEND_API_KEY` | Resend API key for weekly family emails |

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key design decisions

- **Voice over app** — elderly patients do not need to download anything. A phone call is the most accessible interface.
- **Claude for script generation** — each call script is generated fresh per patient and slot, adapting to condition, age, and language rather than using hardcoded templates.
- **Combined rating and description** — subjective questions ask for both a 1–10 score and a brief description in a single exchange, keeping calls short while capturing richer data.
- **Server Actions for privileged operations** — placing calls, saving patients, and re-parsing transcripts all run as Next.js Server Actions to avoid exposing internal secrets to the browser.
- **No Twilio signature validation on webhooks** — Vercel's internal request URL does not match the public URL Twilio signs, causing validation to fail. Each call URL contains a non-guessable UUID instead.

---

## Known limitations (prototype)

- No authentication on nurse or family portals
- Auto-retry on missed calls is not implemented (serverless functions cannot schedule future work without a cron service)
- Weekly email requires a verified Resend sender domain
