import os
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from pydantic import BaseModel
from dotenv import load_dotenv
from io import BytesIO

# =========================
# LOAD ENV
# =========================
load_dotenv()

API_KEY = os.getenv("GOAPI_API_KEY")
BASE_URL = "https://api.goapi.ai/api/v1/task"

# =========================
# FASTAPI APP
# =========================
app = FastAPI()

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# REQUEST MODEL
# =========================
class MusicRequest(BaseModel):
    style_prompt: str
    lyrics: str = "[inst]"
    duration: int = 60


# =========================
# GENERATE MUSIC
# =========================
@app.post("/music/generate-music")
def generate_music(data: MusicRequest):

    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing GOAPI_API_KEY"
        )

    payload = {
        "model": "Qubico/ace-step",
        "task_type": "txt2audio",
        "input": {
            "style_prompt": data.style_prompt,
            "negative_style_prompt": (
    "noise, distortion, robotic voice, low quality audio, silence, broken audio, "
    "clipping, crackling, popping sounds, muffled audio, echo, reverb overload, "
    "out of tune vocals, off-key singing, amateur production, bad mixing, muddy sound, "
    "harsh frequencies, tinny sound, unstable pitch, glitch audio, artifacting, "
    "compressed audio, flat sound, boring arrangement"
),
            "lyrics": data.lyrics,
            "duration": data.duration
        }
    }

    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }

    try:

        res = requests.post(
            BASE_URL,
            json=payload,
            headers=headers,
            timeout=60
        )

        result = res.json()

        if not res.ok:
            raise HTTPException(
                status_code=500,
                detail=result
            )

        task_id = result.get("data", {}).get("task_id")

        return {
            "task_id": task_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================
# TASK STATUS
# =========================
@app.get("/music/task-status/{task_id}")
def task_status(task_id: str):

    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing GOAPI_API_KEY"
        )

    url = f"{BASE_URL}/{task_id}"

    headers = {
        "x-api-key": API_KEY
    }

    try:

        res = requests.get(
            url,
            headers=headers,
            timeout=60
        )

        data = res.json()

        if not res.ok:
            return {
                "status": "error",
                "raw": data
            }

        inner_data = data.get("data") or {}
        output = inner_data.get("output") or {}

        audio_url = output.get("audio_url")

        return {
            "status": inner_data.get("status", "processing"),
            "audio_url": audio_url,
            "raw": data
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# DOWNLOAD AUDIO (FIX)
# =========================
@app.get("/music/download")
def download_audio(audio_url: str):

    if not audio_url:
        raise HTTPException(
            status_code=400,
            detail="Missing audio_url"
        )

    try:

        # Fetch audio from GoAPI
        res = requests.get(
            audio_url,
            stream=True,
            timeout=120
        )

        if not res.ok:
            raise HTTPException(
                status_code=500,
                detail="Failed to fetch audio from source"
            )

        # Return as downloadable file
        return StreamingResponse(
            BytesIO(res.content),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition":
                "attachment; filename=ai_music.mp3"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )