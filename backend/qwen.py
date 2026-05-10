import os
import time
import requests
import urllib3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from io import BytesIO
from urllib.parse import urlparse

# =====================================================
# LOAD ENV
# =====================================================
load_dotenv()

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI()

GOAPI_API_KEY = os.getenv("GOAPI_API_KEY")

if not GOAPI_API_KEY:
    raise Exception("❌ GOAPI_API_KEY missing in .env")

BASE_URL = "https://api.goapi.ai/api/v1/task"

# =====================================================
# CORS
# =====================================================
origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != [""] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# REQUEST SCHEMAS
# =====================================================
class ImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"   # ✅ NEW


class EditRequest(BaseModel):
    image_url: str
    instruction: str


# =====================================================
# ASPECT RATIO MAPPING
# =====================================================
def get_dimensions(aspect_ratio: str):

    ratios = {
        "1:1": (1024, 1024),
        "16:9": (1024, 576),
        "9:16": (576, 1024),
        "4:3": (1024, 768),
        "3:4": (768, 1024),
    }

    return ratios.get(aspect_ratio, (1024, 1024))


# =====================================================
# CREATE TASK
# =====================================================
def create_image_task(prompt: str, aspect_ratio: str = "1:1"):

    width, height = get_dimensions(aspect_ratio)

    headers = {
        "X-API-Key": GOAPI_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "model": "Qubico/qwen-image",
        "task_type": "txt2img",
        "input": {
            "prompt": prompt,
            "negative_prompt": "blurry, low quality, distorted, bad anatomy",
            "width": width,
            "height": height,
            "steps": 16,
            "seed": -1,
            "flow_shift": 3
        }
    }

    print("\n🚀 Sending request to GoAPI...")
    print("📦 Payload:", payload)

    try:
        response = requests.post(
            BASE_URL,
            json=payload,
            headers=headers,
            verify=False,
            timeout=60
        )

        print("📡 STATUS:", response.status_code)
        print("📡 RESPONSE:", response.text)

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=response.text)

        data = response.json()

        task_id = data.get("data", {}).get("task_id")

        if not task_id:
            raise HTTPException(status_code=500, detail="No task_id returned")

        return task_id

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# POLL TASK
# =====================================================
def poll_task(task_id: str, timeout: int = 60):

    headers = {
        "X-API-Key": GOAPI_API_KEY
    }

    url = f"{BASE_URL}/{task_id}"

    for i in range(timeout):

        response = requests.get(url, headers=headers, verify=False, timeout=60)

        print(f"\n🔄 Poll {i+1}")
        print("📡 STATUS:", response.status_code)

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=response.text)

        data = response.json()
        task = data.get("data", {})

        status = task.get("status", "").lower()

        print("📌 STATUS:", status)

        if status == "completed":

            output = task.get("output", {})
            image_url = output.get("image_url")

            return {
                "image_url": image_url,
                "raw": output
            }

        if status == "failed":
            raise HTTPException(status_code=500, detail=task.get("error"))

        time.sleep(2)

    raise HTTPException(status_code=408, detail="Timeout")


# =====================================================
# BUILD EDIT PROMPT
# =====================================================
def build_edit_prompt(instruction: str, image_url: str):

    return f"""
Edit this image while preserving structure.

Image: {image_url}

Instruction: {instruction}

Make it cinematic, high quality, realistic.
"""


# =====================================================
# GENERATE IMAGE
# =====================================================
@app.post("/generate-image")
def generate_image(req: ImageRequest):

    task_id = create_image_task(
        req.prompt,
        req.aspect_ratio
    )

    result = poll_task(task_id)

    return {
        "success": True,
        "task_id": task_id,
        "image_url": result["image_url"]
    }


# =====================================================
# EDIT IMAGE
# =====================================================
@app.post("/edit-image")
def edit_image(req: EditRequest):

    prompt = build_edit_prompt(req.instruction, req.image_url)

    task_id = create_image_task(prompt, "1:1")

    result = poll_task(task_id)

    return {
        "success": True,
        "task_id": task_id,
        "image_url": result["image_url"]
    }


# =====================================================
# DOWNLOAD IMAGE (STREAM FIXED)
# =====================================================
@app.get("/download")
def download_image(url: str):

    try:
        with requests.get(url, stream=True, timeout=20) as response:

            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch image")

            return StreamingResponse(
                response.iter_content(chunk_size=1024),
                media_type="image/png",
                headers={
                    "Content-Disposition": 'attachment; filename="ai-image.png"'
                }
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ROOT
# =====================================================
@app.get("/")
def root():
    return {
        "message": "Qwen Image API running 🚀"
    }