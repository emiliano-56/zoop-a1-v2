import os
import time
import traceback
import requests
import base64

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from moviepy.editor import VideoFileClip, concatenate_videoclips

# =====================================================
# IMPORT PROMPT REFINER
# =====================================================

from refine_prompts import refine_prompt

load_dotenv()

# =====================================================
# ENV
# =====================================================

API_KEY = os.getenv("VEO3_API_KEY")

BASE_URL = os.getenv(
    "BASE_URL",
    "http://127.0.0.1:8000"
)

if not API_KEY:
    raise ValueError("Missing VEO3_API_KEY in .env file")

# =====================================================
# ROUTER
# =====================================================

router = APIRouter()

# =====================================================
# DOWNLOADS
# =====================================================

DOWNLOAD_DIR = "downloads"

os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# =====================================================
# REQUEST MODEL
# =====================================================

class VideoRequest(BaseModel):

    prompt: str

    # 🔥 FORCE AUDIO OFF
    audio: bool = False

    resolution: str = "1080p"

    aspect_ratio: str = "16:9"

    duration_type: str = "8s"

    image_url: str | None = None

    image_base64: str | None = None

    mime_type: str = "image/png"

# =====================================================
# CONVERT IMAGE URL TO BASE64
# =====================================================

def image_url_to_base64(url: str):

    print("\n========== DOWNLOADING IMAGE ==========")
    print("IMAGE URL:", url)

    response = requests.get(url, timeout=120)

    print("IMAGE STATUS:", response.status_code)

    if not response.ok:
        raise Exception(
            f"Failed to download image | "
            f"Status: {response.status_code}"
        )

    encoded = base64.b64encode(
        response.content
    ).decode("utf-8")

    print("BASE64 GENERATED")

    return encoded

# =====================================================
# CLIENT
# =====================================================

class VEO3Client:

    def __init__(
        self,
        api_key,
        base_url="https://api.veo3gen.app"
    ):

        self.base_url = base_url

        self.session = requests.Session()

        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    # =================================================
    # GENERATE VIDEO
    # =================================================

    def generate_video(
        self,
        prompt,
        audio=False,
        resolution="1080p",
        aspect_ratio="16:9",
        image_data=None
    ):

        payload = {
            "model": "veo3-lite",

            # 🔥 USE REFINED PROMPT
            "prompt": prompt,

            # 🔥 FORCE SILENT VIDEO
            "audio": False,

            "modelVersion": "3.1",

            "options": {
                "resolution": resolution,
                "aspectRatio": aspect_ratio
            }
        }

        # =============================================
        # ADD IMAGE
        # =============================================

        if image_data:
            payload["image"] = image_data

        print("\n========== GENERATE PAYLOAD ==========")
        print(payload)

        response = self.session.post(
            f"{self.base_url}/api/generate",
            json=payload,
            timeout=120
        )

        print("\n========== GENERATE RESPONSE ==========")
        print("STATUS CODE:", response.status_code)
        print("RAW RESPONSE:", response.text)

        if not response.ok:
            raise Exception(
                f"Generate API failed | "
                f"Status: {response.status_code} | "
                f"Response: {response.text}"
            )

        return response.json()

    # =================================================
    # CHECK STATUS
    # =================================================

    def check_status(self, task_id):

        print(f"\nChecking status for task: {task_id}")

        response = self.session.get(
            f"{self.base_url}/api/status/{task_id}",
            timeout=60
        )

        print("\n========== STATUS RESPONSE ==========")
        print("STATUS CODE:", response.status_code)
        print("RAW RESPONSE:", response.text)

        if not response.ok:
            raise Exception(
                f"Status API failed | "
                f"Status: {response.status_code} | "
                f"Response: {response.text}"
            )

        return response.json()

    # =================================================
    # DOWNLOAD VIDEO
    # =================================================

    def download_video(
        self,
        video_url,
        filename
    ):

        print("\n========== DOWNLOADING VIDEO ==========")
        print("VIDEO URL:", video_url)

        file_path = os.path.join(
            DOWNLOAD_DIR,
            filename
        )

        r = requests.get(
            video_url,
            stream=True
        )

        print("DOWNLOAD STATUS:", r.status_code)

        if not r.ok:
            raise Exception(
                f"Failed to download clip | "
                f"Status: {r.status_code}"
            )

        with open(file_path, "wb") as f:

            for chunk in r.iter_content(8192):

                if chunk:
                    f.write(chunk)

        print("VIDEO SAVED:", file_path)

        return file_path

# =====================================================
# CLIENT INSTANCE
# =====================================================

client = VEO3Client(API_KEY)

# =====================================================
# WAIT FOR COMPLETION
# =====================================================

def wait_for_completion(
    task_id,
    timeout=600
):

    start_time = time.time()

    while True:

        elapsed = time.time() - start_time

        print(f"\nWaiting... {elapsed:.2f}s elapsed")

        if elapsed > timeout:
            raise Exception("Video generation timeout")

        status = client.check_status(task_id)

        print("\n========== FULL STATUS OBJECT ==========")
        print(status)

        current_status = status.get("status")

        print("CURRENT STATUS:", current_status)

        # =============================================
        # COMPLETED
        # =============================================

        if current_status == "completed":

            result = status.get("result", {})

            print("RESULT:", result)

            video_url = result.get("videoUrl")

            if not video_url:
                raise Exception(
                    f"No video URL returned. "
                    f"Full status: {status}"
                )

            return video_url

        # =============================================
        # FAILED
        # =============================================

        if current_status == "failed":

            print("\n========== GENERATION FAILED ==========")

            error_message = (
                status.get("error")
                or status.get("message")
                or status.get("reason")
                or str(status)
            )

            print("ERROR MESSAGE:", error_message)

            raise Exception(
                f"Generation failed | "
                f"Details: {error_message}"
            )

        # =============================================
        # WAIT
        # =============================================

        time.sleep(5)

# =====================================================
# STITCH VIDEOS
# =====================================================

def stitch_videos(
    video_paths,
    output_name
):

    print("\n========== STITCHING VIDEOS ==========")

    clips = []

    try:

        for path in video_paths:

            print("Loading clip:", path)

            clip = VideoFileClip(path)

            clips.append(clip)

        print("Concatenating clips...")

        final = concatenate_videoclips(
            clips,
            method="compose"
        )

        output_path = os.path.join(
            DOWNLOAD_DIR,
            output_name
        )

        print("Writing final video:", output_path)

        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac"
        )

        final.close()

        print("FINAL VIDEO SAVED:", output_path)

        return output_path

    except Exception as e:

        print("\n========== STITCH ERROR ==========")
        print(str(e))

        traceback.print_exc()

        raise

    finally:

        for clip in clips:

            try:
                clip.close()
            except:
                pass

# =====================================================
# HOME
# =====================================================

@router.get("/")
def home():

    return {
        "message": "VEO3 API running",
        "base_url": BASE_URL
    }

# =====================================================
# GENERATE VIDEO
# =====================================================

@router.post("/generate-video")
def generate_video(req: VideoRequest):

    try:

        print("\n\n======================================")
        print("NEW VIDEO REQUEST RECEIVED")
        print("======================================")

        print(req.dict())

        # =============================================
        # REFINE PROMPT
        # =============================================

        print("\n========== ORIGINAL PROMPT ==========")
        print(req.prompt)

        refined_prompt = refine_prompt(req.prompt)

        print("\n========== REFINED PROMPT ==========")
        print(refined_prompt)

        # =============================================
        # DETERMINE CLIP COUNT
        # =============================================

        if req.duration_type == "8s":
            clip_count = 1

        elif req.duration_type == "30s":
            clip_count = 4

        else:
            clip_count = 7

        print("CLIP COUNT:", clip_count)

        downloaded_paths = []

        # =============================================
        # GENERATE CLIPS
        # =============================================

        for i in range(clip_count):

            print(
                f"\n========== GENERATING CLIP "
                f"{i+1}/{clip_count} =========="
            )

            image_payload = None

            # =========================================
            # PRIORITY 1:
            # DIRECT BASE64
            # =========================================

            if req.image_base64:

                print("USING IMAGE BASE64")

                image_payload = {
                    "bytesBase64Encoded": req.image_base64,
                    "mimeType": req.mime_type
                }

            # =========================================
            # PRIORITY 2:
            # IMAGE URL -> AUTO BASE64
            # =========================================

            elif req.image_url:

                print("USING IMAGE URL")

                base64_image = image_url_to_base64(
                    req.image_url
                )

                image_payload = {
                    "bytesBase64Encoded": base64_image,
                    "mimeType": req.mime_type
                }

            else:

                print("NO IMAGE PROVIDED")

            # =========================================
            # CALL GENERATE
            # =========================================

            result = client.generate_video(
                prompt=refined_prompt,

                # 🔥 FORCE SILENT VIDEO
                audio=False,

                resolution=req.resolution,
                aspect_ratio=req.aspect_ratio,
                image_data=image_payload
            )

            print("\n========== GENERATE RESULT ==========")
            print(result)

            task_id = result.get("taskId")

            if not task_id:

                raise Exception(
                    f"No taskId returned. "
                    f"Full response: {result}"
                )

            print("TASK ID:", task_id)

            # =========================================
            # WAIT FOR VIDEO
            # =========================================

            video_url = wait_for_completion(task_id)

            print("VIDEO URL:", video_url)

            # =========================================
            # DOWNLOAD VIDEO
            # =========================================

            file_path = client.download_video(
                video_url,
                f"clip_{i+1}_{task_id}.mp4"
            )

            downloaded_paths.append(file_path)

        print("\nALL DOWNLOADED PATHS:")
        print(downloaded_paths)

        # =============================================
        # FINAL VIDEO
        # =============================================

        if clip_count == 1:

            final_path = downloaded_paths[0]

        else:

            final_path = stitch_videos(
                downloaded_paths,
                f"final_{req.duration_type}_video.mp4"
            )

        print("\nFINAL PATH:", final_path)

        final_filename = os.path.basename(
            final_path
        )

        # 🔥 FIXED URL
        download_url = (
            f"{BASE_URL}/story-line-videos/file/{final_filename}"
        )

        print("DOWNLOAD URL:", download_url)

        # =============================================
        # SUCCESS RESPONSE
        # =============================================

        return {
            "status": "completed",

            # 🔥 FRONTEND PREVIEW URL
            "download_url": download_url,

            # 🔥 FILE NAME
            "filename": final_filename,

            # 🔥 IMPORTANT FIX
            # used internally by MoviePy later
            "local_path": final_path,

            # 🔥 RETURN REFINED PROMPT TOO
            "refined_prompt": refined_prompt
        }

    except Exception as e:

        print("\n\n======================================")
        print("FULL BACKEND ERROR")
        print("======================================")

        print("ERROR TYPE:", type(e).__name__)
        print("ERROR:", str(e))

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =====================================================
# SERVE FILE
# =====================================================

@router.get("/file/{filename}")
def get_file(filename: str):

    print("\nRequested file:", filename)

    file_path = os.path.join(
        DOWNLOAD_DIR,
        filename
    )

    print("Resolved path:", file_path)

    if not os.path.exists(file_path):

        print("FILE NOT FOUND")

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    print("SERVING FILE")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=filename,
        headers={
            "Content-Disposition":
            f'attachment; filename="{filename}"'
        }
    )