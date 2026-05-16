import requests
import json
import time
import os
import uuid
import jwt

from io import BytesIO
from urllib.parse import unquote

from fastapi import (
    FastAPI,
    HTTPException,
    Header
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from pydantic import BaseModel

from typing import List, Optional

from dotenv import load_dotenv

from supabase import create_client, Client


# =====================================================
# LOAD ENV
# =====================================================

load_dotenv()


# =====================================================
# FASTAPI
# =====================================================

app = FastAPI()


# =====================================================
# CORS
# =====================================================

origins = os.getenv("CORS_ORIGINS", "").split(",")

print("Allowed CORS origins:", origins)

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

SUPABASE_URL = os.getenv("SUPABASE_URL")

SUPABASE_KEY = os.getenv("SUPABASE_KEY")

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


if not GOAPI_API_KEY:
    raise ValueError("GOAPI_API_KEY is missing")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is missing")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY is missing")

if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET is missing")


# =====================================================
# SUPABASE
# =====================================================

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# =====================================================
# REQUEST MODEL
# =====================================================

class GenerateImageRequest(BaseModel):
    prompt: str
    image_urls: Optional[List[str]] = None
    output_format: str = "png"
    aspect_ratio: str = "16:9"


# =====================================================
# AUTH
# =====================================================

def get_user_id(authorization: str):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization token"
        )

    try:
        token = authorization.split(" ")[1]

        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )

        return payload["sub"]

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


# =====================================================
# CREATE GOAPI TASK
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
# FIXED: UPLOAD IMAGE TO SUPABASE
# =====================================================

def upload_image_to_supabase(
    image_url: str,
    task_id: str,
    prompt: str,
    user_id: str
):

    try:
        # Download image
        response = requests.get(image_url, timeout=120)

        if response.status_code != 200:
            raise Exception("Failed to download image")

        image_bytes = response.content

        filename = f"{task_id}-{uuid.uuid4()}.png"
        storage_path = f"{user_id}/{filename}"

        # Upload (FIXED)
        upload_response = supabase.storage.from_("nano-images").upload(
            path=storage_path,
            file=BytesIO(image_bytes),
            file_options={"content-type": "image/png"}
        )

        # Check upload error
        if hasattr(upload_response, "error") and upload_response.error:
            raise Exception(f"Upload failed: {upload_response.error}")

        # Insert into DB
        db_response = supabase.table("Nano_images").insert({
            "user_id": user_id,
            "task_id": task_id,
            "prompt": prompt,
            "storage_path": storage_path
        }).execute()

        if db_response.data is None:
            raise Exception("Database insert failed")

        # Create signed URL (FIXED KEY)
        signed_url_data = supabase.storage \
            .from_("nano-images") \
            .create_signed_url(storage_path, 60 * 60)

        signed_url = signed_url_data.get("signedUrl")

        if not signed_url:
            raise Exception("Failed to generate signed URL")

        return signed_url

    except Exception as e:
        print("❌ SUPABASE UPLOAD ERROR:", str(e))
        return None


# =====================================================
# DOWNLOAD IMAGE
# =====================================================

@app.get("/download-image")
def download_image(image_url: str):

    try:
        decoded_url = unquote(image_url)

        response = requests.get(decoded_url, timeout=120)

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to download image"
            )

        image_bytes = BytesIO(response.content)

        content_type = response.headers.get("Content-Type", "image/png")

        return StreamingResponse(
            image_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition":
                "attachment; filename=generated-image.png"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# GENERATE IMAGE
# =====================================================

@app.post("/generate-image")
def generate_image(
    data: GenerateImageRequest,
    authorization: str = Header(None)
):

    try:
        user_id = get_user_id(authorization)

        task = create_gemini_task(
            prompt=data.prompt,
            output_format=data.output_format,
            aspect_ratio=data.aspect_ratio,
            image_urls=data.image_urls
        )

        if "data" not in task:
            raise HTTPException(
                status_code=500,
                detail="Invalid API response"
            )

        task_id = task["data"]["task_id"]

        for _ in range(60):

            result = get_task_status(task_id)

            status = result["data"]["status"].lower()

            if status == "completed":

                output = result["data"].get("output", {})

                image_url = (
                    output.get("image_url")
                    or (output.get("image_urls") or [None])[0]
                )

                if not image_url:
                    raise HTTPException(
                        status_code=500,
                        detail="No image URL returned"
                    )

                secure_url = upload_image_to_supabase(
                    image_url=image_url,
                    task_id=task_id,
                    prompt=data.prompt,
                    user_id=user_id
                )

                # ✅ IMPORTANT FIX
                if not secure_url:
                    return {
                        "success": False,
                        "message": "Image generated but failed to save"
                    }

                return {
                    "success": True,
                    "task_id": task_id,
                    "status": "completed",
                    "image_url": secure_url
                }

            elif status == "failed":

                return {
                    "success": False,
                    "task_id": task_id,
                    "status": "failed",
                    "error": result["data"].get("error", {})
                }

            time.sleep(5)

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


# =====================================================
# GET USER IMAGES
# =====================================================

@app.get("/images")
def get_images(
    authorization: str = Header(None)
):

    try:
        user_id = get_user_id(authorization)

        response = supabase.table("Nano_images") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()

        images = []

        for item in response.data:

            signed_url_data = supabase.storage \
                .from_("nano-images") \
                .create_signed_url(
                    item["storage_path"],
                    60 * 60
                )

            images.append({
                "id": item["id"],
                "task_id": item["task_id"],
                "prompt": item["prompt"],
                "image_url": signed_url_data.get("signedUrl"),
                "created_at": item["created_at"]
            })

        return {
            "success": True,
            "images": images
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )