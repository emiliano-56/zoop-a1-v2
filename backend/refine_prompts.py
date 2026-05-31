import os
import requests
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"


def refine_prompt(prompt: str) -> str:
    """
    Refines long cinematic story prompts into
    short optimized Veo animation prompts.
    """

    try:
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }

        system_prompt = """
You are an AI prompt optimizer for cinematic AI video generation.

Your job:
- Convert long story scene prompts into short cinematic animation prompts.
- Keep the core subject, environment, action, and mood.
- Remove narration and unnecessary words.
- Keep it under 180 characters.
- Output ONLY the refined prompt.
- No quotation marks.
- No explanations.
"""

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 100
        }

        response = requests.post(
            DEEPSEEK_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        response.raise_for_status()

        data = response.json()

        refined = (
            data["choices"][0]["message"]["content"]
            .strip()
            .replace('"', '')
        )

        # EXTRA SAFETY LIMIT
        refined = refined[:180]

        return refined

    except Exception as e:
        print("PROMPT REFINE ERROR:", e)

        # fallback
        return prompt[:180]