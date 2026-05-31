import os
import uuid
import asyncio
import edge_tts
import pysrt
import requests
import numpy as np

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from moviepy.editor import (
    AudioFileClip,
    ImageClip,
    VideoFileClip,
    CompositeVideoClip,
    concatenate_videoclips
)

from moviepy.video.VideoClip import (
    ImageClip as MoviePyImageClip
)

from PIL import (
    Image,
    ImageDraw,
    ImageFont
)

# =====================================================
# IMPORT MEMORY STORE
# =====================================================

from memory_store import ASSET_STORE

print("SUBTITLE MEMORY:", id(ASSET_STORE))

# =====================================================
# ROUTER
# =====================================================

router = APIRouter()

# =====================================================
# DIRECTORIES
# =====================================================

AUDIO_DIR = "audio"
SUBTITLE_DIR = "subtitles"
FINAL_VIDEO_DIR = "final_videos"
TEMP_DIR = "temp_assets"

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(SUBTITLE_DIR, exist_ok=True)
os.makedirs(FINAL_VIDEO_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# =====================================================
# 🔥 FIX ADDED (ONLY ADDITION)
# =====================================================

BASE_URL = "http://localhost:8000"

# =====================================================
# MODELS
# =====================================================

class FinalScene(BaseModel):

    scene_number: int
    title: str
    prompt: str
    subtitle: str
    image: str | None = None
    asset_id: str | None = None
    videoUrl: str | None = None


class FinalMovieRequest(BaseModel):

    scenes: list[FinalScene]
    animate: bool = False
    voice: str = "en-US-AriaNeural"

# =====================================================
# EDGE TTS
# =====================================================

async def edge_tts_generate(
    text: str,
    voice: str,
    output_path: str
):

    communicate = edge_tts.Communicate(
        text=text,
        voice=voice
    )

    await communicate.save(output_path)

# =====================================================
# GENERATE AUDIO
# =====================================================

def generate_scene_audio(
    text: str,
    voice: str
):

    filename = f"{uuid.uuid4()}.mp3"

    output_path = os.path.join(
        AUDIO_DIR,
        filename
    )

    asyncio.run(
        edge_tts_generate(
            text=text,
            voice=voice,
            output_path=output_path
        )
    )

    return output_path

# =====================================================
# DOWNLOAD IMAGE
# =====================================================

def download_image_to_temp(
    image_url: str
):

    response = requests.get(
        image_url,
        timeout=120
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download image: {image_url}"
        )

    filename = f"{uuid.uuid4()}.png"

    temp_path = os.path.join(TEMP_DIR, filename)

    with open(temp_path, "wb") as f:
        f.write(response.content)

    return temp_path

# =====================================================
# 🔥 WORD-BY-WORD SUBTITLE SYSTEM (NEW)
# =====================================================

def create_word_by_word_clips(
    text: str,
    duration: float,
    width: int,
    height: int
):

    words = text.split()

    if not words:
        return []

    word_duration = duration / len(words)

    clips = []
    current_time = 0

    for word in words:

        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("arial.ttf", 60)
        except:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), word, font=font)

        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = (width - text_width) // 2
        y = height - 180

        # background box
        draw.rounded_rectangle(
            (x - 40, y - 20, x + text_width + 40, y + text_height + 20),
            radius=25,
            fill=(0, 0, 0, 180)
        )

        # highlighted word
        draw.text(
            (x, y),
            word,
            font=font,
            fill=(255, 255, 0, 255)
        )

        frame = np.array(img)

        clip = (
            MoviePyImageClip(frame)
            .set_start(current_time)
            .set_duration(word_duration)
            .set_position(("center", "center"))
        )

        clips.append(clip)
        current_time += word_duration

    return clips

# =====================================================
# CREATE SRT
# =====================================================

def create_srt_file(subtitles: list[str], durations: list[float]):

    subs = pysrt.SubRipFile()
    current_time = 0

    for index, subtitle in enumerate(subtitles):

        duration = durations[index]
        start_time = current_time
        end_time = current_time + duration

        sub = pysrt.SubRipItem(
            index=index + 1,
            start=pysrt.SubRipTime(seconds=start_time),
            end=pysrt.SubRipTime(seconds=end_time),
            text=subtitle
        )

        subs.append(sub)
        current_time = end_time

    filename = f"{uuid.uuid4()}.srt"
    output_path = os.path.join(SUBTITLE_DIR, filename)

    subs.save(output_path)

    return output_path

# =====================================================
# CREATE VIDEO FROM IMAGE
# =====================================================

def create_video_from_image(
    image_path: str,
    audio_path: str,
    subtitle_text: str,
    output_path: str
):

    audio_clip = AudioFileClip(audio_path)
    duration = audio_clip.duration

    image_clip = (
        ImageClip(image_path)
        .set_duration(duration)
        .resize((1280, 720))
    )

    image_clip = image_clip.resize(lambda t: 1 + (0.04 * t / duration))

    # 🔥 REPLACED STATIC SUBTITLES
    subtitle_clips = create_word_by_word_clips(
        subtitle_text,
        duration,
        1280,
        720
    )

    final_clip = CompositeVideoClip([
        image_clip,
        *subtitle_clips
    ])

    final_clip = final_clip.set_audio(audio_clip)

    final_clip.write_videofile(
        output_path,
        fps=24,
        codec="libx264",
        audio_codec="aac"
    )

    return output_path

# =====================================================
# APPLY SUBTITLE TO VIDEO
# =====================================================

def apply_subtitle_to_video(
    video_path: str,
    audio_path: str,
    subtitle_text: str,
    output_path: str
):

    video_clip = VideoFileClip(video_path)
    audio_clip = AudioFileClip(audio_path)

    # 🔥 REPLACED STATIC SUBTITLES
    subtitle_clips = create_word_by_word_clips(
        subtitle_text,
        video_clip.duration,
        int(video_clip.w),
        int(video_clip.h)
    )

    final_clip = CompositeVideoClip([
        video_clip,
        *subtitle_clips
    ])

    final_clip = final_clip.set_audio(audio_clip)

    final_clip.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        fps=24
    )

    return output_path

# =====================================================
# MERGE VIDEOS
# =====================================================

def merge_scene_videos(video_paths: list[str]):

    clips = []

    for path in video_paths:
        clips.append(VideoFileClip(path))

    final_clip = concatenate_videoclips(clips, method="compose")

    filename = f"final_{uuid.uuid4()}.mp4"
    output_path = os.path.join(FINAL_VIDEO_DIR, filename)

    final_clip.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        fps=24
    )

    return output_path

# =====================================================
# GENERATE FINAL MOVIE
# =====================================================

@router.post("/generate-final-movie")
def generate_final_movie(req: FinalMovieRequest):

    try:

        rendered_scene_videos = []
        subtitles = []
        durations = []

        for index, scene in enumerate(req.scenes):

            audio_path = generate_scene_audio(scene.subtitle, req.voice)
            audio_clip = AudioFileClip(audio_path)

            durations.append(audio_clip.duration)
            subtitles.append(scene.subtitle)

            output_scene_path = os.path.join(
                FINAL_VIDEO_DIR,
                f"scene_{index + 1}_{uuid.uuid4()}.mp4"
            )

            if req.animate:

                apply_subtitle_to_video(
                    scene.videoUrl,
                    audio_path,
                    scene.subtitle,
                    output_scene_path
                )

            else:

                local_image = download_image_to_temp(scene.image)

                create_video_from_image(
                    local_image,
                    audio_path,
                    scene.subtitle,
                    output_scene_path
                )

            rendered_scene_videos.append(output_scene_path)

        srt_file = create_srt_file(subtitles, durations)
        final_video_path = merge_scene_videos(rendered_scene_videos)

        return {
            "status": "completed",
            "download_url": f"{BASE_URL}/final_videos/{os.path.basename(final_video_path)}",
            "subtitle_file": f"{BASE_URL}/subtitles/{os.path.basename(srt_file)}"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()

        raise HTTPException(status_code=500, detail=str(e))