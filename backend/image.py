# app.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import base64
import os
from io import BytesIO
from PIL import Image

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
# =========================
# STATIC IMAGES FOLDER
# =========================

IMAGES_FOLDER = "images"

os.makedirs(IMAGES_FOLDER, exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGES_FOLDER), name="images")

# =========================
# GET GALLERY IMAGES
# =========================

@app.get("/gallery-images")
async def get_gallery_images():

    supported_extensions = (".png", ".jpg", ".jpeg", ".webp")

    files = [
        file
        for file in os.listdir(IMAGES_FOLDER)
        if file.lower().endswith(supported_extensions)
    ]

    images = []

    for index, file in enumerate(files):
        images.append({
            "id": index + 1,
            "name": file,
            "url": f"http://127.0.0.1:8000/image/images/{file}"
        })

    return images

# =========================
# IMPORT IMAGE FROM URL
# =========================

class ImageUrlRequest(BaseModel):
    url: str

@app.post("/import-image")
async def import_image(data: ImageUrlRequest):

    try:

        response = requests.get(data.url)

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to download image"
            )

        content_type = response.headers.get("Content-Type")

        if not content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="URL is not an image"
            )

        image_bytes = response.content

        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        return {
            "mime_type": content_type,
            "image_base64": base64_image
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =========================
# OPTIONAL
# SAVE URL IMAGES TO GALLERY
# =========================

class SaveImageRequest(BaseModel):
    url: str
    filename: str

@app.post("/save-image")
async def save_image(data: SaveImageRequest):

    try:

        response = requests.get(data.url)

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to download image"
            )

        image = Image.open(BytesIO(response.content))

        filepath = os.path.join(IMAGES_FOLDER, data.filename)

        image.save(filepath)

        return {
            "message": "Image saved successfully",
            "path": filepath
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =========================
# TEST ROUTE
# =========================

@app.get("/")
async def root():
    return {
        "message": "Backend running successfully"
    }