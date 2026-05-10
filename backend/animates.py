import os
import time
import requests

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from moviepy.editor import VideoFileClip, concatenate_videoclips

# =====================================================
# ENV
# =====================================================
load_dotenv()

API_KEY = os.getenv("VEO3_API_KEY")
if not API_KEY:
    raise ValueError("Missing VEO3_API_KEY in .env file")

# =====================================================
# APP (mounted as /animates)
# =====================================================
app = FastAPI(title="VEO3 Image Animator")

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
# STORAGE
# =====================================================
DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# =====================================================
# REQUEST MODEL
# =====================================================
class VideoRequest(BaseModel):
    prompt: str
    audio: bool = False   # ALWAYS FALSE (safe default)
    resolution: str = "720p"
    aspect_ratio: str = "16:9"
    duration_type: str = "8s"
    image_url: str | None = None
    image_base64: str | None = None
    mime_type: str = "image/jpeg"

# =====================================================
# CLIENT
# =====================================================
class VEO3Client:
    def __init__(self, api_key, base_url="https://api.veo3gen.app"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def generate_video(self, prompt, audio=False, resolution="720p", aspect_ratio="16:9", image_data=None):
        payload = {
            "model": "veo3-lite",

            # 🔥 FORCE NO AUDIO ALWAYS
            "audio": False,
            "generate_audio": False,

            "prompt": prompt,
            "modelVersion": "3.1",
            "options": {
                "resolution": resolution,
                "aspectRatio": aspect_ratio
            }
        }

        if image_data:
            payload["image"] = image_data

        res = self.session.post(
            f"{self.base_url}/api/generate",
            json=payload
        )

        if not res.ok:
            raise Exception(res.text)

        return res.json()

    def check_status(self, task_id):
        res = self.session.get(
            f"{self.base_url}/api/status/{task_id}"
        )

        if not res.ok:
            raise Exception(res.text)

        return res.json()

    def download_video(self, url, filename):
        path = os.path.join(DOWNLOAD_DIR, filename)

        r = requests.get(url, stream=True)
        if not r.ok:
            raise Exception("Download failed")

        with open(path, "wb") as f:
            for chunk in r.iter_content(8192):
                if chunk:
                    f.write(chunk)

        return path


client = VEO3Client(API_KEY)

# =====================================================
# HELPERS
# =====================================================
def wait_for_completion(task_id):
    while True:
        status = client.check_status(task_id)

        data = status.get("result") or status.get("data") or {}

        if status.get("status") == "completed":
            return data.get("videoUrl")

        if status.get("status") == "failed":
            raise Exception("Generation failed")

        time.sleep(5)


def stitch_videos(paths, output_name):
    clips = [VideoFileClip(p) for p in paths]
    final = concatenate_videoclips(clips, method="compose")

    output_path = os.path.join(DOWNLOAD_DIR, output_name)
    final.write_videofile(output_path)

    for c in clips:
        c.close()

    return output_path

# =====================================================
# ROUTES (UNDER /animates)
# =====================================================

@app.get("/")
def home():
    return {"message": "Animates API running under /animates"}

# -----------------------------------------------------
# CREATE VIDEO
# -----------------------------------------------------
@app.post("/animates_video")
def generate_video(req: VideoRequest):
    try:
        clip_count = 1 if req.duration_type == "8s" else 4 if req.duration_type == "30s" else 7

        downloaded = []

        for i in range(clip_count):

            image_payload = None
            if req.image_base64:
                image_payload = {
                    "bytesBase64Encoded": req.image_base64,
                    "mimeType": req.mime_type
                }

            result = client.generate_video(
                prompt=req.prompt,
                audio=False,  # 🔥 FORCE OFF
                resolution=req.resolution,
                aspect_ratio=req.aspect_ratio,
                image_data=image_payload,
            )

            task_id = result["taskId"]

            video_url = wait_for_completion(task_id)

            file_path = client.download_video(
                video_url,
                f"clip_{i+1}_{task_id}.mp4"
            )

            downloaded.append(file_path)

        # FINAL OUTPUT
        if len(downloaded) == 1:
            final_path = downloaded[0]
        else:
            final_path = stitch_videos(
                downloaded,
                f"final_{req.duration_type}.mp4"
            )

        return {
            "status": "completed",
            "download_url": f"http://127.0.0.1:8000/animates/file/{os.path.basename(final_path)}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------
# FILE SERVING
# -----------------------------------------------------
@app.get("/file/{filename}")
def get_file(filename: str):
    path = os.path.join(DOWNLOAD_DIR, filename)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=path,
        media_type="video/mp4",
        filename=filename
    )