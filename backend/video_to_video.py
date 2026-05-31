import os
import requests

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

from dotenv import load_dotenv

# ====================================
# LOAD ENV
# ====================================

load_dotenv()

DOMOAI_API_KEY = os.getenv("DOMOAI_API_KEY")

if not DOMOAI_API_KEY:
    raise ValueError("DOMOAI_API_KEY not found in .env")


# ====================================
# ROUTER
# ====================================

router = APIRouter()


# ====================================
# VIDEO TO VIDEO ROUTE
# ====================================

@router.post("/video-to-video")
async def video_to_video(
    video: UploadFile = File(...)
):
    try:

        # ====================================
        # CREATE TEMP DIRECTORY
        # ====================================

        temp_dir = "temp_videos"
        os.makedirs(temp_dir, exist_ok=True)

        temp_video_path = os.path.join(
            temp_dir,
            video.filename
        )

        # ====================================
        # SAVE VIDEO LOCALLY
        # ====================================

        with open(temp_video_path, "wb") as f:
            f.write(await video.read())

        # ====================================
        # STEP 1:
        # REQUEST DOMOAI UPLOAD URL
        # ====================================

        upload_url = "https://api.domoai.com/v1/upload/file"

        upload_payload = {
            "filename": video.filename
        }

        upload_headers = {
            "Authorization": f"Bearer {DOMOAI_API_KEY}",
            "Content-Type": "application/json"
        }

        upload_response = requests.post(
            upload_url,
            json=upload_payload,
            headers=upload_headers
        )

        # ====================================
        # CHECK UPLOAD URL RESPONSE
        # ====================================

        if upload_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=upload_response.text
            )

        upload_data = upload_response.json()["data"]

        presigned_url = upload_data["presigned_url"]

        presigned_headers = upload_data["headers"]

        domoai_uri = upload_data["domoai_uri"]

        # ====================================
        # STEP 2:
        # UPLOAD VIDEO TO PRESIGNED URL
        # ====================================

        with open(temp_video_path, "rb") as video_file:

            upload_file_response = requests.put(
                presigned_url,
                data=video_file,
                headers=presigned_headers
            )

        # ====================================
        # CHECK VIDEO UPLOAD RESPONSE
        # ====================================

        if upload_file_response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=500,
                detail=upload_file_response.text
            )

        # ====================================
        # STEP 3:
        # CREATE VIDEO TASK
        # ====================================

        video_generate_url = "https://api.domoai.com/v1/video/video2video"

        video_payload = {
            "prompt": "anime style, vibrant colors",
            "model": "anime-v5.5",
            "video": {
                "domoai_uri": domoai_uri
            },
            "seconds": 5
        }

        video_headers = {
            "Authorization": f"Bearer {DOMOAI_API_KEY}",
            "Content-Type": "application/json"
        }

        video_response = requests.post(
            video_generate_url,
            json=video_payload,
            headers=video_headers
        )

        # ====================================
        # CHECK VIDEO TASK RESPONSE
        # ====================================

        if video_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=video_response.text
            )

        result = video_response.json()

        # ====================================
        # RETURN RESPONSE
        # ====================================

        return {
            "success": True,
            "message": "Video generation task created",
            "result": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

