import os
import time
import requests
import asyncio
import edge_tts
import traceback
import base64
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from moviepy.video.fx.all import loop

from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    CompositeVideoClip,
    concatenate_videoclips,
    CompositeAudioClip
)

from moviepy.video.VideoClip import ImageClip
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# =====================================================
# ENV
# =====================================================

load_dotenv()

API_KEY = os.getenv("VEO3_API_KEY")

if not API_KEY:
    raise ValueError("Missing VEO3_API_KEY")

app = FastAPI()

# =====================================================
# CORS
# =====================================================

origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
# MODELS
# =====================================================

class Scene(BaseModel):
    prompt: str
    subtitle: str

    image_base64: str | None = None
    image_url: str | None = None
    mime_type: str = "image/jpeg"


class StoryRequest(BaseModel):
    scenes: list[Scene]

    # GLOBAL SETTINGS
    voice: str = "en-US-AriaNeural"
    resolution: str = "1080p"
    aspect_ratio: str = "16:9"

    text_color: str = "#ffffff"
    bg_color: str = "#000000"

    bg_music_base64: str | None = None


# =====================================================
# VEO CLIENT
# =====================================================

class VEO3Client:

    def __init__(self, api_key):

        self.base_url = "https://api.veo3gen.app"

        self.session = requests.Session()

        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def generate_video(
        self,
        prompt,
        resolution,
        aspect_ratio,
        image_data=None
    ):

        payload = {
            "model": "veo3-lite",
            "prompt": prompt,
            "audio": False,
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
                f.write(chunk)

        return path


client = VEO3Client(API_KEY)

# =====================================================
# HELPERS
# =====================================================

def wait_for_completion(task_id):

    while True:

        status = client.check_status(task_id)

        if status["status"] == "completed":
            return status["result"]["videoUrl"]

        if status["status"] == "failed":
            raise Exception("Generation failed")

        time.sleep(5)


async def generate_voice(text, voice, filename):

    tts = edge_tts.Communicate(text, voice)
    await tts.save(filename)


def run_async(coro):

    loop_async = asyncio.new_event_loop()

    asyncio.set_event_loop(loop_async)

    loop_async.run_until_complete(coro)

    loop_async.close()


# =====================================================
# IMAGE URL → BASE64
# =====================================================

def download_image_as_base64(url: str):

    try:

        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        res = requests.get(
            url,
            timeout=15,
            headers=headers
        )

        if not res.ok:
            raise Exception("Failed to download image")

        encoded = base64.b64encode(
            res.content
        ).decode("utf-8")

        return {
            "bytesBase64Encoded": encoded,
            "mimeType": res.headers.get(
                "Content-Type",
                "image/jpeg"
            )
        }

    except Exception as e:

        raise Exception(
            f"Image download failed: {str(e)}"
        )


# =====================================================
# COLOR HELPERS
# =====================================================

def hex_to_rgba(hex_color, alpha=255):

    hex_color = hex_color.lstrip("#")

    r, g, b = tuple(
        int(hex_color[i:i+2], 16)
        for i in (0, 2, 4)
    )

    return (r, g, b, alpha)


# =====================================================
# WORD SUBTITLES
# =====================================================

def make_word_subtitles(
    text,
    size,
    duration,
    text_color,
    bg_color
):

    words = text.split()

    clips = []

    if len(words) == 0:
        return []

    word_duration = duration / len(words)

    try:

        font = ImageFont.truetype(
            "arial.ttf",
            45
        )

    except:

        font = ImageFont.load_default()

    t_color = hex_to_rgba(text_color)

    b_color = hex_to_rgba(bg_color, 180)

    for i, word in enumerate(words):

        img = Image.new(
            "RGBA",
            size,
            (0, 0, 0, 0)
        )

        draw = ImageDraw.Draw(img)

        bbox = draw.textbbox(
            (0, 0),
            word,
            font=font
        )

        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        x = (size[0] - text_w) // 2

        y = size[1] - 140

        padding = 15

        draw.rectangle(
            [
                x - padding,
                y - padding,
                x + text_w + padding,
                y + text_h + padding
            ],
            fill=b_color
        )

        draw.text(
            (x, y),
            word,
            font=font,
            fill=t_color
        )

        clip = (
            ImageClip(np.array(img))
            .set_start(i * word_duration)
            .set_duration(word_duration)
        )

        clips.append(clip)

    return clips


# =====================================================
# STORY ENDPOINT
# =====================================================

@app.post("/animates_story")
def animates_story(req: StoryRequest, request: Request):

    try:

        request_id = str(uuid.uuid4())

        final_clips = []

        # =================================================
        # GENERATE SCENES
        # =================================================

        for i, scene in enumerate(req.scenes):

            image_payload = None

            # BASE64 IMAGE
            if scene.image_base64:

                image_payload = {
                    "bytesBase64Encoded": scene.image_base64,
                    "mimeType": scene.mime_type
                }

            # IMAGE URL
            elif scene.image_url:

                image_payload = download_image_as_base64(
                    scene.image_url
                )

            # =============================================
            # GENERATE VIDEO
            # =============================================

            result = client.generate_video(
                prompt=scene.prompt,
                resolution=req.resolution,
                aspect_ratio=req.aspect_ratio,
                image_data=image_payload
            )

            task_id = result["taskId"]

            video_url = wait_for_completion(task_id)

            raw_video = client.download_video(
                video_url,
                f"{request_id}_scene_{i}.mp4"
            )

            # =============================================
            # GENERATE VOICE
            # =============================================

            audio_path = os.path.join(
                DOWNLOAD_DIR,
                f"{request_id}_audio_{i}.mp3"
            )

            run_async(
                generate_voice(
                    scene.subtitle,
                    req.voice,
                    audio_path
                )
            )

            # =============================================
            # LOAD VIDEO + AUDIO
            # =============================================

            clip = VideoFileClip(raw_video)

            audio = AudioFileClip(audio_path)

            # =============================================
            # LOOP VIDEO TO MATCH AUDIO LENGTH
            # =============================================

            if clip.duration < audio.duration:

                clip = loop(
                    clip,
                    duration=audio.duration
                )

            else:

                clip = clip.subclip(
                    0,
                    audio.duration
                )

            # APPLY AUDIO
            clip = clip.set_audio(audio)

            # =============================================
            # SUBTITLES
            # =============================================

            subtitle_clips = make_word_subtitles(
                scene.subtitle,
                clip.size,
                audio.duration,
                req.text_color,
                req.bg_color
            )

            final_scene = CompositeVideoClip([
                clip,
                *subtitle_clips
            ])

            out_path = os.path.join(
                DOWNLOAD_DIR,
                f"{request_id}_final_{i}.mp4"
            )

            final_scene.write_videofile(
                out_path,
                codec="libx264",
                audio_codec="aac"
            )

            final_clips.append(out_path)

            clip.close()
            audio.close()
            final_scene.close()

        # =================================================
        # MERGE ALL SCENES
        # =================================================

        clips = [
            VideoFileClip(p)
            for p in final_clips
        ]

        final_video = concatenate_videoclips(
            clips,
            method="compose"
        )

        # =================================================
        # GLOBAL BACKGROUND MUSIC
        # =================================================

        if req.bg_music_base64:

            music_path = os.path.join(
                DOWNLOAD_DIR,
                f"{request_id}_bg_music.mp3"
            )

            with open(music_path, "wb") as f:

                f.write(
                    base64.b64decode(
                        req.bg_music_base64
                    )
                )

            bg_music = (
                AudioFileClip(music_path)
                .volumex(0.15)
                .set_duration(final_video.duration)
            )

            original_audio = final_video.audio

            mixed_audio = CompositeAudioClip([
                original_audio,
                bg_music
            ])

            final_video = final_video.set_audio(
                mixed_audio
            )

        # =================================================
        # EXPORT FINAL VIDEO
        # =================================================

        output = os.path.join(
            DOWNLOAD_DIR,
            f"{request_id}_final_story.mp4"
        )

        final_video.write_videofile(
            output,
            codec="libx264",
            audio_codec="aac"
        )

        # =================================================
        # CLEANUP
        # =================================================

        for c in clips:
            c.close()

        final_video.close()

        # =================================================
        # RESPONSE
        # =================================================

        host = request.headers.get("host")

        return {
            "status": "completed",
            "download_url": f"http://{host}/animates/file/{os.path.basename(output)}"
        }

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================
# FILE SERVER
# =====================================================

@app.get("/file/{filename}")
def get_file(filename: str):

    path = os.path.join(
        DOWNLOAD_DIR,
        filename
    )

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return FileResponse(
        path,
        media_type="video/mp4"
    )