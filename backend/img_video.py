# backend.py
import os
import time
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from moviepy.editor import VideoFileClip, concatenate_videoclips

load_dotenv()

API_KEY = os.getenv("VEO3_API_KEY")
if not API_KEY:
    raise ValueError("Missing VEO3_API_KEY in .env file")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


class VideoRequest(BaseModel):
    prompt: str
    audio: bool = True
    resolution: str = "1080p"
    aspect_ratio: str = "16:9"
    duration_type: str = "8s"  # 8s or 30s or 56s
    image_url: str | None = None
    image_base64: str | None = None
    mime_type: str = "image/jpeg"


class VEO3Client:
    def __init__(self, api_key, base_url="https://api.veo3gen.app"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def generate_video(self, prompt, audio=True, resolution="1080p", aspect_ratio="16:9", image_data=None):
        payload = {
            "model": "veo3-quality",
            "prompt": prompt,
            "audio": audio,
            "modelVersion": "3.1",
            "options": {
                "resolution": resolution,
                "aspectRatio": aspect_ratio
            }
        }

        if image_data:
            payload["image"] = image_data

        response = self.session.post(
            f"{self.base_url}/api/generate",
            json=payload
        )

        if not response.ok:
            raise Exception(response.text)

        return response.json()

    def check_status(self, task_id):
        response = self.session.get(
            f"{self.base_url}/api/status/{task_id}"
        )

        if not response.ok:
            raise Exception(response.text)

        return response.json()

    def download_video(self, video_url, filename):
        file_path = os.path.join(DOWNLOAD_DIR, filename)

        r = requests.get(video_url, stream=True)
        if not r.ok:
            raise Exception("Failed to download clip")

        with open(file_path, "wb") as f:
            for chunk in r.iter_content(8192):
                if chunk:
                    f.write(chunk)

        return file_path


client = VEO3Client(API_KEY)


def wait_for_completion(task_id):
    while True:
        status = client.check_status(task_id)

        if status["status"] == "completed":
            return status["result"]["videoUrl"]

        if status["status"] == "failed":
            raise Exception("Generation failed")

        time.sleep(5)


def stitch_videos(video_paths, output_name):
    clips = [VideoFileClip(path) for path in video_paths]
    final = concatenate_videoclips(clips, method="compose")

    output_path = os.path.join(DOWNLOAD_DIR, output_name)
    final.write_videofile(output_path)

    for clip in clips:
        clip.close()

    return output_path


@app.get("/")
def home():
    return {"message": "VEO3 API running with 8s + 30s support"}


@app.post("/generate-video")
def generate_video(req: VideoRequest):
    try:
        # 8s = 1 clip
        # 30s = 4 clips stitched
        # 56s = 7 clips stitched
        if req.duration_type == "8s":
            clip_count = 1
        elif req.duration_type == "30s":
            clip_count = 4
        else:
            clip_count = 7

        downloaded_paths = []

        for i in range(clip_count):
            image_payload = None
            if req.image_base64:
                image_payload = {
                    "bytesBase64Encoded": req.image_base64,
                    "mimeType": req.mime_type
                }

            result = client.generate_video(
                prompt=req.prompt,
                audio=req.audio,
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
            downloaded_paths.append(file_path)

        if clip_count == 1:
            final_path = downloaded_paths[0]
        else:
            final_path = stitch_videos(
                downloaded_paths,
                f"final_{req.duration_type}_video.mp4"
            )

        return {
            "status": "completed",
            "download_url": f"http://127.0.0.1:8000/img-video/file/{os.path.basename(final_path)}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/file/{filename}")
def get_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=filename
    )