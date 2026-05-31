import requests
import time
import os
import json
import uuid
import base64

from io import BytesIO
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# =====================================================
# IMPORT SHARED MEMORY STORE
# =====================================================

from memory_store import ASSET_STORE

print("STORY_LINE MEMORY:", id(ASSET_STORE))

load_dotenv()

app = FastAPI()

# =====================================================
# CORS
# =====================================================

origins = os.getenv(
    "CORS_ORIGINS",
    ""
).split(",")

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

GOAPI_API_KEY = os.getenv(
    "GOAPI_API_KEY"
)

DEEPSEEK_API_KEY = os.getenv(
    "DEEPSEEK_API_KEY"
)

BASE_URL = "https://api.goapi.ai"

DEEPSEEK_URL = (
    "https://api.deepseek.com/chat/completions"
)

if not GOAPI_API_KEY:
    raise ValueError(
        "GOAPI_API_KEY missing"
    )

if not DEEPSEEK_API_KEY:
    raise ValueError(
        "DEEPSEEK_API_KEY missing"
    )

# =====================================================
# MODELS
# =====================================================

class StoryGenerationRequest(BaseModel):

    story_idea: str

    style: str

    audience: str

    niche: str

    mood: str

    number_of_chapters: int

    number_of_characters: int


class GenerateImageRequest(BaseModel):

    prompt: str

    aspect_ratio: str = "16:9"

    output_format: str = "png"

    image_urls: Optional[List[str]] = None

# =====================================================
# DEEPSEEK STORY GENERATION
# =====================================================

def generate_story(
    data: StoryGenerationRequest
):

    system_prompt = f"""
You are an elite animated movie storyteller,
anime narrative designer,
fantasy cinematic writer,
and AI movie scene creator.

YOUR ENTIRE JOB IS TO CREATE STORIES
THAT FEEL LIKE THEY EXIST INSIDE
A HIGH-END ANIMATED MOVIE.

IMPORTANT GLOBAL RULES:
- every character must feel animated
- every environment must feel animated
- everything must resemble:
  anime,
  Pixar,
  Disney,
  DreamWorks,
  Studio Ghibli
- NEVER describe realism
- NEVER describe photography
- NEVER describe live-action cinema
- NEVER use realistic human descriptions
- NEVER generate screenplay formatting

VERY IMPORTANT:
The story MUST feel impossible
to adapt into live-action.

The entire world must feel
stylized, emotional,
fantasy-driven,
and cinematic.

VISUAL STYLE RULES:
- expressive animated faces
- stylized anime hair
- magical cinematic lighting
- vibrant fantasy colors
- whimsical fantasy worlds
- emotional anime reactions
- exaggerated cinematic emotions
- cel-shaded animation aesthetic
- animated movie framing
- dreamy fantasy atmosphere

CHARACTER DESIGN RULES:
Every character must include:
- animated appearance
- stylized facial design
- colorful visual identity
- fantasy-inspired clothing
- expressive personality traits

ENVIRONMENT RULES:
All environments must feel:
- magical
- cinematic
- colorful
- emotionally immersive
- fantasy inspired
- stylized like animated films

STORY RULES:
- focus on storytelling only
- no screenplay format
- no camera instructions
- no image generation instructions
- scenes should feel cinematic
- scenes should feel emotional
- scenes should feel visual

VERY IMPORTANT:
Each scene MUST include:
- a cinematic visual prompt
- a subtitle narration
- emotional narration
- short subtitle text
- subtitle should be concise
- subtitle should feel cinematic
- subtitle should be 1-2 sentences max

STYLE CONTEXT:
Story Style: {data.style}
Audience: {data.audience}
Niche: {data.niche}
Mood: {data.mood}

Create exactly
{data.number_of_characters}
characters.

Create exactly
{data.number_of_chapters}
scenes.

USER STORY IDEA:
{data.story_idea}

Return ONLY valid JSON
in this exact structure:

{{
  "title": "Story Title",

  "characters": [
    {{
      "name": "",
      "age": "",
      "description": "",
      "personality": ""
    }}
  ],

  "story": [
    {{
      "scene_number": 1,

      "title": "",

      "prompt": "",

      "subtitle": ""
    }}
  ]
}}
"""

    headers = {
        "Authorization":
        f"Bearer {DEEPSEEK_API_KEY}",

        "Content-Type":
        "application/json"
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

    content = (
        content
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    try:

        parsed = json.loads(content)

        return parsed

    except Exception:

        raise HTTPException(
            status_code=500,

            detail=f"Invalid JSON: {content}"
        )

# =====================================================
# CREATE GOAPI TASK
# =====================================================

def create_seedream_task(
    prompt,
    output_format="png",
    aspect_ratio="16:9",
    image_urls=None
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
# TASK STATUS
# =====================================================

def get_task_status(task_id):

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
# GENERATE STORY ROUTE
# =====================================================

@app.post("/generate-story")
def generate_story_route(
    data: StoryGenerationRequest
):

    story = generate_story(data)

    return {

        "success": True,

        "story": story
    }

# =====================================================
# GENERATE IMAGE
# =====================================================

@app.post("/generate-image")
def generate_image(
    data: GenerateImageRequest
):

    enhanced_prompt = f"""
{data.prompt}

STRICT STYLE RULES:
- animated characters only
- anime/cartoon style only
- animated movie aesthetic
- stylized fantasy illustration
- expressive animated emotions
- vibrant animation colors
- cel shaded look
- cinematic animated lighting
- magical fantasy atmosphere
- stylized animated environments

NEGATIVE RULES:
- no realism
- no live action
- no photography
- no photorealism
- no hyper realistic humans
- no realistic skin
- no cinematic realism
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

            detail=f"Bad response: {task}"
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

        # =========================================
        # COMPLETED
        # =========================================

        if status == "completed":

            output = result_data.get(
                "output",
                {}
            )

            image_url = (
                output.get("image_url")
                or (
                    output.get("image_urls")
                    or [None]
                )[0]
                or output.get("url")
            )

            if not image_url:

                raise HTTPException(
                    status_code=500,

                    detail="No image URL returned"
                )

            # =====================================
            # DOWNLOAD IMAGE
            # =====================================

            image_response = requests.get(
                image_url,

                timeout=120
            )

            if image_response.status_code != 200:

                raise HTTPException(
                    status_code=400,

                    detail="Failed to fetch image"
                )

            image_bytes = image_response.content

            # =====================================
            # BASE64 CONVERSION
            # =====================================

            image_base64 = base64.b64encode(
                image_bytes
            ).decode("utf-8")

            mime_type = image_response.headers.get(
                "Content-Type",
                "image/png"
            )

            # =====================================
            # CREATE SHARED ASSET
            # =====================================

            asset_id = str(uuid.uuid4())

            ASSET_STORE[asset_id] = {

                "base64": image_base64,

                "mime_type": mime_type,

                "image_url": image_url
            }

            print(
                "ASSET STORED:",
                asset_id
            )

            return {

                "success": True,

                "status": "completed",

                "image_url": image_url,

                "asset_id": asset_id
            }

        # =========================================
        # FAILED
        # =========================================

        elif status == "failed":

            return {

                "success": False,

                "status": "failed",

                "result": result
            }

        time.sleep(retry_delay)

    # =============================================
    # TIMEOUT
    # =============================================

    return {

        "success": False,

        "status": "timeout"
    }

# =====================================================
# DOWNLOAD IMAGE
# =====================================================

@app.get("/download-image")
def download_image(
    image_url: str
):

    decoded_url = unquote(image_url)

    response = requests.get(
        decoded_url,

        timeout=120
    )

    if response.status_code != 200:

        raise HTTPException(
            status_code=400,

            detail="Failed download"
        )

    image_bytes = BytesIO(
        response.content
    )

    return StreamingResponse(

        image_bytes,

        media_type=response.headers.get(
            "Content-Type",
            "image/png"
        ),

        headers={
            "Content-Disposition":
            "attachment; filename=story-image.png"
        }
    )

# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():

    return {
        "message":
        "AI Storytelling API running"
    }