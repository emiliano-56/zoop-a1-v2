import requests
import json
import time
import os
from io import BytesIO
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# CONFIG
# =====================================================

GOAPI_API_KEY = os.getenv("GOAPI_API_KEY")
BASE_URL = "https://api.goapi.ai"

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions"

if not GOAPI_API_KEY:
    raise ValueError("GOAPI_API_KEY is missing in .env file")

if not DEEPSEEK_API_KEY:
    raise ValueError("DEEPSEEK_API_KEY is missing in .env file")


# =====================================================
# REQUEST MODELS
# =====================================================

class GenerateImageRequest(BaseModel):
    prompt: str
    image_urls: Optional[List[str]] = None
    output_format: str = "png"
    aspect_ratio: str = "2:3"


class CreateBookRequest(BaseModel):
    topic: str
    author_name: str
    genre: str
    age_group: str
    cover_style: str
    cover_aspect_ratio: str
    chapters: int


# =====================================================
# GEMINI IMAGE GENERATOR
# =====================================================

def create_gemini_task(
    prompt: str,
    output_format: str = "png",
    aspect_ratio: str = "2:3",
    image_urls: Optional[List[str]] = None
):
    url = f"{BASE_URL}/api/v1/task"

    payload = {
        "model": "gemini",
        "task_type": "gemini-2.5-flash-image",
        "input": {
            "prompt": prompt,
            "output_format": output_format,
            "aspect_ratio": aspect_ratio
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
        data=json.dumps(payload),
        timeout=120
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    return response.json()


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


def generate_image_from_prompt(
    prompt: str,
    aspect_ratio: str = "2:3"
):
    task = create_gemini_task(
        prompt=prompt,
        output_format="png",
        aspect_ratio=aspect_ratio
    )

    if "data" not in task:
        return None

    task_id = task["data"]["task_id"]

    max_retries = 60
    retry_delay = 5

    for _ in range(max_retries):
        result = get_task_status(task_id)

        status = result["data"]["status"].lower()

        if status == "completed":
            output = result["data"].get("output", {})

            image_url = (
                output.get("image_url")
                or (output.get("image_urls") or [None])[0]
            )

            return image_url

        elif status == "failed":
            return None

        time.sleep(retry_delay)

    return None


# =====================================================
# CLEAN BOOK CONTENT GENERATOR
# =====================================================

def clean_book_text(text: str):
    """
    Remove markdown symbols like ### *** ## and clean formatting
    """

    text = text.replace("###", "")
    text = text.replace("##", "")
    text = text.replace("***", "")
    text = text.replace("**", "")
    text = text.replace("---", "")
    text = text.replace("```", "")

    return text.strip()


def generate_book_content(
    topic: str,
    author_name: str,
    genre: str,
    age_group: str,
    chapters: int
):
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = (
        f"Create a fully professional publish-ready children's story book.\n\n"

        f"Topic: {topic}\n"
        f"Author Name: {author_name}\n"
        f"Genre: {genre}\n"
        f"Age Group: {age_group}\n"
        f"Number of Chapters: {chapters}\n\n"

        f"VERY IMPORTANT RULES:\n"
        f"- Do NOT use markdown symbols\n"
        f"- Do NOT use ###\n"
        f"- Do NOT use ***\n"
        f"- Do NOT use ##\n"
        f"- Do NOT use bullet markdown formatting\n"
        f"- Output must be clean plain professional book formatting only\n\n"

        f"The book must include:\n"
        f"1. Book Title\n"
        f"2. Copyright Page\n"
        f"3. Dedication Page\n"
        f"4. Introduction\n"
        f"5. Table of Contents\n"
        f"6. All Chapters with chapter titles\n"
        f"7. Professional storytelling\n"
        f"8. Conclusion if needed\n\n"

        f"Make it feel like a real published book for Amazon KDP.\n"
        f"Make it beautiful, emotional, professional, and publish-ready."
    )

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.8,
        "max_tokens": 6000
    }

    response = requests.post(
        DEEPSEEK_BASE_URL,
        headers=headers,
        json=payload,
        timeout=180
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    result = response.json()
    raw_content = result["choices"][0]["message"]["content"]

    return clean_book_text(raw_content)


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
                "Content-Disposition": "attachment; filename=book-cover.png"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# CREATE BOOK
# =====================================================

@app.post("/create-book")
def create_book(data: CreateBookRequest):
    try:
        # Generate clean full book content
        book_content = generate_book_content(
            topic=data.topic,
            author_name=data.author_name,
            genre=data.genre,
            age_group=data.age_group,
            chapters=data.chapters
        )

        # Generate professional cover only
        cover_prompt = (
            f"Professional premium book cover design for "
            f"'{data.topic}' written by {data.author_name}. "
            f"Genre: {data.genre}. "
            f"Style: {data.cover_style}. "
            f"Elegant publishing quality. "
            f"Book title and author name clearly visible. "
            f"Beautiful cinematic illustration. "
            f"Professional storybook cover for publishing."
        )

        cover_image_url = generate_image_from_prompt(
            prompt=cover_prompt,
            aspect_ratio=data.cover_aspect_ratio
        )

        return {
            "success": True,
            "author_name": data.author_name,
            "book_content": book_content,
            "cover_image_url": cover_image_url
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
       