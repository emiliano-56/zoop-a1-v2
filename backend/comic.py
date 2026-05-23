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

class ColoringBookRequest(BaseModel):
    book_idea: str
    style: str
    audience: str
    niche: str
    mood: str
    number_of_pages: int
    number_of_characters: int
    aspect_ratio: str = "3:4"


class GenerateImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "3:4"
    output_format: str = "png"
    image_urls: Optional[List[str]] = None


# =====================================================
# DEEPSEEK COLORING BOOK GENERATION
# =====================================================

def generate_coloring_book(data: ColoringBookRequest):

    system_prompt = f"""
You are an expert children's coloring book creator,
line-art illustrator,
activity book designer,
and printable coloring page prompt engineer.

Your job is to create HIGH-QUALITY coloring book pages.

=====================================================
IMPORTANT RULES
=====================================================

- Generate ONLY coloring book scenes
- NO comic panels
- NO manga
- NO speech bubbles
- NO dialogue
- NO narration
- NO typography
- NO cinematic lighting
- NO realistic shading
- NO gradients
- NO painted illustrations
- NO photorealism
- NO dark shadows

Every image must be:
- black and white
- clean line art
- thick outlines
- easy to color
- kid-friendly
- printable
- simple but detailed
- coloring-book style
- white background
- vector-style outlines
- uncluttered composition
- large coloring spaces

=====================================================
CHARACTERS
=====================================================

Create exactly {data.number_of_characters} unique characters.

Every character must include:
- name
- age
- appearance
- hairstyle
- clothing
- personality
- simple coloring-book traits
- consistent visual identity

=====================================================
COLORING BOOK PAGES
=====================================================

Generate exactly {data.number_of_pages} coloring book pages.

Every page MUST contain:

- page_number
- title
- scene_description
- elements
- final_prompt

=====================================================
FINAL PROMPT RULES
=====================================================

Every final_prompt MUST:

- describe the full scene clearly
- describe all important characters
- describe objects and background
- emphasize coloring book style
- mention black and white line art
- mention thick clean outlines
- mention printable coloring page
- mention white background
- mention vector-style illustration
- mention large open coloring spaces
- mention no shading
- mention no colors
- mention kid-friendly composition

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

Book Idea:
{data.book_idea}

=====================================================
RETURN FORMAT
=====================================================

Return ONLY valid JSON.

JSON structure:

{{
  "title": "Coloring Book Title",

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

      "title": "",

      "scene_description": "",

      "elements": [],

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
        "temperature": 0.8
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

    # Remove markdown wrappers
    content = (
        content
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    try:

        parsed = json.loads(content)

        # =====================================================
        # COLORING BOOK SUFFIX
        # =====================================================

        coloring_suffix = """
children's coloring book page,
black and white line art,
clean outlines,
thick contour lines,
printable coloring page,
white background,
vector-style illustration,
kids coloring book,
outline drawing,
large open coloring spaces,
simple clean composition,
easy to color,
no shading,
no gradients,
no gray tones,
no colors,
no text,
no speech bubbles,
no typography,
professional line art,
crisp outline illustration
"""

        # =====================================================
        # ENHANCE PROMPTS
        # =====================================================

        for page in parsed.get("pages", []):

            elements_text = ""

            if page.get("elements"):

                elements_text = (
                    "Include these elements: "
                    + ", ".join(page["elements"])
                    + "."
                )

            page["final_prompt"] = f"""
{page["final_prompt"]}

IMPORTANT:
Generate this as a PROFESSIONAL coloring book page.

STYLE RULES:
- black and white only
- clean line art
- thick outlines
- no shading
- no colors
- no gray tones
- no speech bubbles
- no text
- printable page
- white background
- coloring book illustration
- vector-style outline art
- child-friendly
- large coloring spaces
- simple clean composition

{elements_text}

{coloring_suffix}
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
    aspect_ratio: str = "3:4",
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
            "size": "2K",

            # IMPORTANT:
            # Add negative prompt if supported
            "negative_prompt": """
realistic,
photo,
painting,
watercolor,
3d render,
comic,
manga,
speech bubbles,
dialogue,
text,
typography,
cinematic lighting,
dark shadows,
gradients,
gray tones,
photorealism,
detailed shading,
colorful,
rendered illustration
"""
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
# GENERATE COLORING BOOK STORY ROUTE
# =====================================================

@app.post("/generate-coloring-book")
def generate_book(data: ColoringBookRequest):

    try:

        story = generate_coloring_book(data)

        return {
            "success": True,
            "coloring_book": story
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
Generate this as a PROFESSIONAL coloring book page.

STYLE RULES:
- black and white only
- clean line art
- thick outlines
- no shading
- no colors
- no gray tones
- no speech bubbles
- no text
- printable page
- white background
- coloring book illustration
- vector-style outline art
- child-friendly
- large coloring spaces
- simple clean composition

QUALITY REQUIREMENTS:
- crisp outline drawing
- highly readable outlines
- smooth vector-style lines
- coloring-book quality
- clean printable illustration
- centered composition
- uncluttered background

DO NOT GENERATE:
- comic panels
- manga
- realistic images
- painted art
- cinematic scenes
- shadows
- gradients
- typography
- letters
- words
- captions
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
                "Content-Disposition": "attachment; filename=coloring-book-page.png"
            }
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "AI Coloring Book Generator API Running"
    }