"""
detect_language.py
Detects the patient's preferred language from a short audio sample or text snippet.
Currently uses simple keyword matching; can be upgraded to Anthropic classification.

Usage:
    python tools/detect_language.py --patient_id <uuid> --text "<spoken text>"
"""

import argparse
import json
import os

import anthropic
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

SUPPORTED_LANGUAGES = {"en": "English", "hi": "Hindi"}


def detect_language(patient_id: str, text: str) -> str:
    """Classify spoken text as 'en' (English) or 'hi' (Hindi) using Claude."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        messages=[
            {
                "role": "user",
                "content": f'Classify this spoken text as either "en" (English) or "hi" (Hindi). Reply with only the two-letter code.\n\nText: {text}',
            }
        ],
    )
    lang = message.content[0].text.strip().lower()
    if lang not in SUPPORTED_LANGUAGES:
        lang = "en"  # Default to English

    # Update patient record
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    supabase.table("patients").update({"language": lang}).eq("id", patient_id).execute()

    print(json.dumps({"patient_id": patient_id, "detected_language": lang, "language_name": SUPPORTED_LANGUAGES[lang]}))
    return lang


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patient_id", required=True)
    parser.add_argument("--text", required=True)
    args = parser.parse_args()
    detect_language(args.patient_id, args.text)
