import requests
import time
import os
import json
from io import BytesIO
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# =====================================================
# CORS
# =====================================================

origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# CONFIG
# =====================================================

GOAPI_API_KEY = os.getenv("GOAPI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

BASE_URL = "https://api.goapi.ai"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

if not GOAPI_API_KEY:
    raise ValueError("GOAPI_API_KEY missing")

if not DEEPSEEK_API_KEY:
    raise ValueError("DEEPSEEK_API_KEY missing")

# =====================================================
# MODELS
# =====================================================

class ComicGenerationRequest(BaseModel):
    story_idea: str
    style: str
    audience: str
    niche: str
    mood: str
    number_of_pages: int
    number_of_characters: int
    aspect_ratio: str = "16:9"


class GenerateImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    output_format: str = "png"
    image_urls: Optional[List[str]] = None

# =====================================================
# DEEPSEEK COMIC STORY GENERATION
# =====================================================

def generate_comic_story(data: ComicGenerationRequest):

    system_prompt = f"""
You are an expert comic book writer,
graphic novel designer,
storyboard artist,
comic dialogue writer,
and comic prompt engineer.

Your job is to create REAL comic book scenes
with REAL comic dialogue.

IMPORTANT:
- DO NOT create normal AI art prompts
- DO NOT create cinematic wallpaper prompts
- DO NOT create portrait prompts
- Every image MUST feel like a comic panel
- Every page MUST feel like a graphic novel
- Every page MUST contain dialogue
- Dialogue MUST feel natural and emotional
- Dialogue must be short and comic-friendly
- Speech bubbles must feel authentic

=====================================================
CHARACTERS
=====================================================

Create exactly {data.number_of_characters} unique comic characters.

Every character must include:
- name
- age
- appearance
- hairstyle
- clothing
- personality
- comic-style visual traits
- consistent visual identity

=====================================================
COMIC PAGES
=====================================================

Generate exactly {data.number_of_pages} comic pages.

Every page MUST contain:

- page_number
- scene_description
- dialogue
- narration
- sfx
- final_prompt

=====================================================
DIALOGUE RULES
=====================================================

dialogue must be an array like this:

"dialogue": [
  {{
    "speaker": "Leo",
    "text": "Whoa... you can TALK?!"
  }},
  {{
    "speaker": "Sprig",
    "text": "Hehe! Of course I can!"
  }}
]

RULES:
- Make dialogue emotional
- Make dialogue short
- Make dialogue readable
- Make dialogue child-friendly
- Make dialogue comic-style
- Avoid long paragraphs
- Make conversations natural

=====================================================
NARRATION RULES
=====================================================

Example:

"narration": "Leo had just discovered something magical."

=====================================================
SFX RULES
=====================================================

Example:

"sfx": [
  "drip drip",
  "rustle",
  "whoosh"
]

=====================================================
FINAL PROMPT RULES
=====================================================

Every final_prompt MUST:

- include ALL character descriptions
- include speech bubbles WITH readable text
- include comic narration boxes
- include comic sound effect text
- mention who is speaking
- emphasize comic storytelling
- describe comic composition
- describe comic framing
- describe comic layout
- describe sequential storytelling
- describe comic page structure
- mention graphic novel illustration
- mention comic typography
- mention comic dialogue
- mention readable speech bubbles
- mention narration boxes
- mention comic-style scene
- mention storyboard frame
- mention comic panel framing
- ensure text is readable and correctly spelled

=====================================================
STYLE
=====================================================

Style:
{data.style}

Audience:
{data.audience}

Niche:
{data.niche}

Mood:
{data.mood}

Story Idea:
{data.story_idea}

=====================================================
VERY IMPORTANT
=====================================================

The generated images should feel like:

- comic panels
- manga pages
- graphic novel scenes
- illustrated comic storytelling

NOT standalone illustrations.

=====================================================
RETURN FORMAT
=====================================================

Return ONLY valid JSON.

JSON structure:

{{
  "title": "Comic Title",

  "characters": [
    {{
      "name": "",
      "age": "",
      "description": "",
      "personality": ""
    }}
  ],

  "pages": [
    {{
      "page_number": 1,

      "scene_description": "",

      "dialogue": [
        {{
          "speaker": "",
          "text": ""
        }}
      ],

      "narration": "",

      "sfx": [],

      "final_prompt": ""
    }}
  ]
}}
"""

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            }
        ],
        "temperature": 0.9
    }

    response = requests.post(
        DEEPSEEK_URL,
        headers=headers,
        json=payload,
        timeout=120
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    result = response.json()

    content = result["choices"][0]["message"]["content"]

    # remove markdown wrappers
    content = content.replace("```json", "").replace("```", "").strip()

    try:

        parsed = json.loads(content)

        # =====================================================
        # FORCE COMIC KEYWORDS INTO EVERY PROMPT
        # =====================================================

        comic_suffix = """
comic book panel,
comic storytelling,
graphic novel illustration,
comic composition,
storyboard frame,
comic page layout,
readable speech bubbles,
comic dialogue,
comic narration boxes,
comic typography,
comic-style scene,
sequential storytelling,
comic illustration,
comic frame,
comic book art,
dynamic comic composition,
graphic novel panel,
speech bubbles with readable text,
professional comic lettering,
comic page structure
"""

        for page in parsed.get("pages", []):

            # ===============================================
            # BUILD DIALOGUE TEXT
            # ===============================================

            dialogue_text = ""

            for d in page.get("dialogue", []):

                speaker = d.get("speaker", "")
                text = d.get("text", "")

                dialogue_text += (
                    f'Speech bubble from {speaker} says "{text}". '
                )

            narration_text = ""

            if page.get("narration"):
                narration_text = (
                    f'Narration box says "{page["narration"]}". '
                )

            sfx_text = ""

            if page.get("sfx"):

                sfx_joined = ", ".join(page["sfx"])

                sfx_text = (
                    f'Comic sound effects include {sfx_joined}. '
                )

            # ===============================================
            # ENHANCE FINAL PROMPT
            # ===============================================

            page["final_prompt"] = f"""
{page["final_prompt"]}

IMPORTANT:
Generate this as a REAL comic book panel.

{dialogue_text}

{narration_text}

{sfx_text}

The speech bubbles MUST contain readable text.
The dialogue MUST be visible.
The spelling MUST be correct.
Use authentic comic typography.
Use professional comic lettering.
Use real comic speech bubbles.
Use comic narration boxes.
Maintain comic page composition.

{comic_suffix}
"""

        return parsed

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON from DeepSeek: {content}"
        )

# =====================================================
# GOAPI CREATE TASK
# =====================================================

def create_seedream_task(
    prompt: str,
    output_format: str = "png",
    aspect_ratio: str = "16:9",
    image_urls: Optional[List[str]] = None
):

    url = f"{BASE_URL}/api/v1/task"

    payload = {
        "model": "seedream",
        "task_type": "seedream-5-lite",
        "input": {
            "prompt": prompt,
            "output_format": output_format,
            "aspect_ratio": aspect_ratio,
            "size": "2K"
        },
        "config": {
            "service_mode": "public"
        }
    }

    if image_urls:
        payload["input"]["image_urls"] = image_urls

    headers = {
        "X-API-Key": GOAPI_API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=120
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    return response.json()

# =====================================================
# GET TASK STATUS
# =====================================================

def get_task_status(task_id: str):

    url = f"{BASE_URL}/api/v1/task/{task_id}"

    headers = {
        "X-API-Key": GOAPI_API_KEY
    }

    response = requests.get(
        url,
        headers=headers,
        timeout=120
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    return response.json()

# =====================================================
# GENERATE COMIC STORY ROUTE
# =====================================================

@app.post("/generate-comic-story")
def generate_comic(data: ComicGenerationRequest):

    try:

        story = generate_comic_story(data)

        return {
            "success": True,
            "comic": story
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =====================================================
# GENERATE IMAGE ROUTE
# =====================================================

@app.post("/generate-image")
def generate_image(data: GenerateImageRequest):

    try:

        enhanced_prompt = f"""
{data.prompt}

IMPORTANT:
Generate this as a REAL comic book panel.

The image MUST include:
- readable comic dialogue
- readable speech bubbles
- comic narration boxes
- comic typography
- professional comic lettering
- comic storytelling
- comic page composition
- graphic novel illustration
- storyboard composition
- comic panel framing
- comic layout
- sequential storytelling
- comic-style scene

IMPORTANT TEXT RULES:
- speech bubbles must contain readable English text
- dialogue must be visible
- spelling must be correct
- typography must look professional
- comic text must be integrated naturally
"""

        task = create_seedream_task(
            prompt=enhanced_prompt,
            output_format=data.output_format,
            aspect_ratio=data.aspect_ratio,
            image_urls=data.image_urls
        )

        task_data = task.get("data")

        if not task_data:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid API response: {task}"
            )

        task_id = task_data.get("task_id")

        max_retries = 30
        retry_delay = 15

        for _ in range(max_retries):

            result = get_task_status(task_id)

            result_data = result.get("data", {})

            status = str(
                result_data.get("status", "")
            ).lower()

            if status == "completed":

                output = result_data.get("output", {})

                image_url = (
                    output.get("image_url")
                    or (output.get("image_urls") or [None])[0]
                    or output.get("url")
                )

                return {
                    "success": True,
                    "task_id": task_id,
                    "status": "completed",
                    "image_url": image_url,
                    "raw_output": output,
                    "prompt_used": enhanced_prompt
                }

            elif status == "failed":

                return {
                    "success": False,
                    "status": "failed",
                    "result": result
                }

            time.sleep(retry_delay)

        return {
            "success": False,
            "status": "timeout"
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =====================================================
# DOWNLOAD IMAGE
# =====================================================

@app.get("/download-image")
def download_image(image_url: str):

    try:

        decoded_url = unquote(image_url)

        response = requests.get(
            decoded_url,
            timeout=120
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to download image"
            )

        image_bytes = BytesIO(response.content)

        content_type = response.headers.get(
            "Content-Type",
            "image/png"
        )

        return StreamingResponse(
            image_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": "attachment; filename=comic.png"
            }
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )