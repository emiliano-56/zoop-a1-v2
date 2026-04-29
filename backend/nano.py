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
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# =====================================================
# CORS
# =====================================================
origins = os.getenv("CORS_ORIGINS", "").split(",")

print("Allowed CORS origins:", origins)  # 👈 helps debug

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
BASE_URL = "https://api.goapi.ai"

if not GOAPI_API_KEY:
    raise ValueError("GOAPI_API_KEY is missing in .env file")


# =====================================================
# REQUEST MODEL
# =====================================================

class GenerateImageRequest(BaseModel):
    prompt: str
    image_urls: Optional[List[str]] = None
    output_format: str = "png"
    aspect_ratio: str = "16:9"


# =====================================================
# CREATE TASK
# =====================================================

def create_gemini_task(
    prompt: str,
    output_format: str = "png",
    aspect_ratio: str = "16:9",
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


# =====================================================
# CHECK TASK STATUS
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
# DOWNLOAD IMAGE ROUTE
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
                detail="Failed to download image from source"
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
                "Content-Disposition": "attachment; filename=generated-image.png"
            }
        )

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
        task = create_gemini_task(
            prompt=data.prompt,
            output_format=data.output_format,
            aspect_ratio=data.aspect_ratio,
            image_urls=data.image_urls
        )

        print("TASK CREATED:", task)

        if "data" not in task:
            raise HTTPException(
                status_code=500,
                detail="Invalid API response"
            )

        task_id = task["data"]["task_id"]

        max_retries = 60
        retry_delay = 5

        for _ in range(max_retries):
            result = get_task_status(task_id)

            print("TASK RESULT:", result)

            status = result["data"]["status"].lower()

            if status == "completed":
                output = result["data"].get("output", {})

                image_url = (
                    output.get("image_url")
                    or (output.get("image_urls") or [None])[0]
                )

                return {
                    "success": True,
                    "task_id": task_id,
                    "status": "completed",
                    "image_url": image_url,
                    "image_urls": output.get("image_urls", [])
                }

            elif status == "failed":
                return {
                    "success": False,
                    "task_id": task_id,
                    "status": "failed",
                    "error": result["data"].get("error", {})
                }

            time.sleep(retry_delay)

        return {
            "success": False,
            "task_id": task_id,
            "status": "timeout",
            "message": "Still processing. Try again later."
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )