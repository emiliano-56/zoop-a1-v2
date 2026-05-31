import os
import uuid
import asyncio
import edge_tts
import pysrt
import requests
import numpy as np
import traceback

from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Form
)

from pydantic import BaseModel

from moviepy.editor import (
    AudioFileClip,
    ImageClip,
    VideoFileClip,
    CompositeVideoClip,
    concatenate_videoclips,
    CompositeAudioClip,
    concatenate_audioclips
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
# DEBUG HELPER
# =====================================================

def log_debug(label: str, data=None):
    print("\n==============================")
    print(f"DEBUG: {label}")
    print("==============================")
    if data is not None:
        print(data)

# =====================================================
# COLOR HELPER
# =====================================================

def hex_to_rgba(hex_color, alpha=255):

    hex_color = hex_color.lstrip("#")

    if len(hex_color) != 6:
        return (255, 255, 255, alpha)

    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    return (r, g, b, alpha)

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

# NEW
BG_MUSIC_DIR = "bg_music"
UPLOADED_MUSIC_DIR = "uploaded_music"

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(SUBTITLE_DIR, exist_ok=True)
os.makedirs(FINAL_VIDEO_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# NEW
os.makedirs(BG_MUSIC_DIR, exist_ok=True)
os.makedirs(UPLOADED_MUSIC_DIR, exist_ok=True)

# =====================================================
# BASE URL
# =====================================================

BASE_URL = "https://zoop-a1-v2.onrender.com/"

# =====================================================
# DELETE TIME
# =====================================================

DELETE_TIME = 300

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

    # FRONTEND PREVIEW URL
    videoUrl: str | None = None

    # LOCAL FILE PATH FOR MOVIEPY
    videoPath: str | None = None


class FinalMovieRequest(BaseModel):

    scenes: list[FinalScene]

    animate: bool = False

    voice: str = "en-US-AriaNeural"

    # SUBTITLE COLORS
    subtitle_text_color: str = "#FFFF00"
    subtitle_bg_color: str = "#000000"

    # MUSIC
    selected_music: str | None = None
    uploaded_music: str | None = None

    # VOLUME
    music_volume: float = 0.3

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
# AUDIO GENERATION
# =====================================================

async def generate_scene_audio(
    text: str,
    voice: str
):

    log_debug("GENERATING AUDIO", text)

    filename = f"{uuid.uuid4()}.mp3"

    output_path = os.path.join(
        AUDIO_DIR,
        filename
    )

    await edge_tts_generate(
        text=text,
        voice=voice,
        output_path=output_path
    )

    log_debug("AUDIO SAVED", output_path)

    return output_path

# =====================================================
# DOWNLOAD IMAGE
# =====================================================

def download_image_to_temp(image_url: str):

    log_debug("DOWNLOADING IMAGE", image_url)

    response = requests.get(image_url, timeout=120)

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download image: {image_url}"
        )

    filename = f"{uuid.uuid4()}.png"

    temp_path = os.path.join(
        TEMP_DIR,
        filename
    )

    with open(temp_path, "wb") as f:
        f.write(response.content)

    log_debug("IMAGE SAVED", temp_path)

    return temp_path

# =====================================================
# SUBTITLE CHUNKING
# =====================================================

def chunk_words(
    text: str,
    chunk_size: int = 4
):
    words = text.split()

    return [
        " ".join(words[i:i + chunk_size])
        for i in range(0, len(words), chunk_size)
    ]

def create_chunked_subtitle_clips(
    text: str,
    duration: float,
    width: int,
    height: int,
    chunk_size: int = 4,
    text_color: str = "#FFFF00",
    bg_color: str = "#000000"
):

    log_debug("CREATING SUBTITLE", text)

    chunks = chunk_words(text, chunk_size)

    log_debug("CHUNKS", chunks)

    if not chunks:
        return []

    chunk_duration = duration / len(chunks)

    clips = []

    current_time = 0

    for i, chunk in enumerate(chunks):

        img = Image.new(
            "RGBA",
            (width, height),
            (0, 0, 0, 0)
        )

        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype(
                "arial.ttf",
                60
            )
        except:
            font = ImageFont.load_default()

        bbox = draw.textbbox(
            (0, 0),
            chunk,
            font=font
        )

        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = (width - text_width) // 2
        y = height - 180

        draw.rounded_rectangle(
            (
                x - 50,
                y - 25,
                x + text_width + 50,
                y + text_height + 25
            ),
            radius=25,
            fill=hex_to_rgba(bg_color, 180)
        )

        draw.text(
            (x, y),
            chunk,
            font=font,
            fill=hex_to_rgba(text_color)
        )

        frame = np.array(img)

        clip = (
            MoviePyImageClip(frame)
            .set_start(current_time)
            .set_duration(chunk_duration)
            .set_position(("center", "center"))
        )

        clips.append(clip)

        log_debug("CHUNK TIMING", {
            "chunk": chunk,
            "start": current_time,
            "duration": chunk_duration
        })

        current_time += chunk_duration

    return clips

# =====================================================
# SRT FUNCTION
# =====================================================

def create_srt_file(
    subtitles: list[str],
    durations: list[float]
):

    log_debug("CREATING SRT FILE", None)

    subs = pysrt.SubRipFile()

    current_time = 0

    for index, subtitle in enumerate(subtitles):

        duration = durations[index]

        start_time = current_time
        end_time = current_time + duration

        subs.append(
            pysrt.SubRipItem(
                index=index + 1,
                start=pysrt.SubRipTime(seconds=start_time),
                end=pysrt.SubRipTime(seconds=end_time),
                text=subtitle
            )
        )

        current_time = end_time

    filename = f"{uuid.uuid4()}.srt"

    output_path = os.path.join(
        SUBTITLE_DIR,
        filename
    )

    subs.save(output_path)

    log_debug("SRT SAVED", output_path)

    return output_path

# =====================================================
# BACKGROUND MUSIC
# =====================================================

def add_background_music(
    video_path,
    music_path,
    volume=0.3
):

    video_clip = VideoFileClip(video_path)

    original_audio = video_clip.audio

    music_clip = (
        AudioFileClip(music_path)
        .volumex(volume)
    )

    # LOOP MUSIC IF SHORT

    if music_clip.duration < video_clip.duration:

        loops = int(
            video_clip.duration / music_clip.duration
        ) + 1

        music_clips = [music_clip] * loops

        music_clip = concatenate_audioclips(
            music_clips
        )

    music_clip = music_clip.subclip(
        0,
        video_clip.duration
    )

    final_audio = CompositeAudioClip([
        original_audio,
        music_clip
    ])

    final_video = video_path.replace(
        ".mp4",
        "_music.mp4"
    )

    final_clip = video_clip.set_audio(final_audio)

    final_clip.write_videofile(
        final_video,
        codec="libx264",
        audio_codec="aac",
        fps=24
    )

    return final_video

# =====================================================
# AUTO DELETE
# =====================================================

async def auto_delete_file(
    path,
    delay=DELETE_TIME
):

    await asyncio.sleep(delay)

    try:

        if os.path.exists(path):

            os.remove(path)

            print("DELETED:", path)

    except Exception as e:

        print("DELETE ERROR:", e)

# =====================================================
# VIDEO FROM IMAGE
# =====================================================

def create_video_from_image(
    image_path,
    audio_path,
    subtitle_text,
    output_path,
    text_color="#FFFF00",
    bg_color="#000000"
):

    audio_clip = AudioFileClip(audio_path)

    duration = audio_clip.duration

    image_clip = (
        ImageClip(image_path)
        .set_duration(duration)
        .resize((1280, 720))
    )

    image_clip = image_clip.resize(
        lambda t: 1 + (0.04 * t / duration)
    )

    subtitle_clips = create_chunked_subtitle_clips(
        subtitle_text,
        duration,
        1280,
        720,
        text_color=text_color,
        bg_color=bg_color
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
# APPLY VIDEO SUBTITLES
# =====================================================

def apply_subtitle_to_video(
    video_path,
    audio_path,
    subtitle_text,
    output_path,
    text_color="#FFFF00",
    bg_color="#000000"
):

    if not video_path:
        raise Exception("Missing video path")

    if video_path.startswith("http"):
        raise Exception(
            "MoviePy requires local file path, not URL"
        )

    print("\n========== USING LOCAL VIDEO ==========")
    print(video_path)

    if not os.path.exists(video_path):
        raise Exception(
            f"Video file does not exist: {video_path}"
        )

    video_clip = VideoFileClip(video_path)

    audio_clip = AudioFileClip(audio_path)

    subtitle_clips = create_chunked_subtitle_clips(
        subtitle_text,
        video_clip.duration,
        int(video_clip.w),
        int(video_clip.h),
        text_color=text_color,
        bg_color=bg_color
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

def merge_scene_videos(video_paths):

    clips = [
        VideoFileClip(p)
        for p in video_paths
    ]

    final_clip = concatenate_videoclips(
        clips,
        method="compose"
    )

    output_path = os.path.join(
        FINAL_VIDEO_DIR,
        f"final_{uuid.uuid4()}.mp4"
    )

    final_clip.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        fps=24
    )

    return output_path

# =====================================================
# BG MUSIC LIST ENDPOINT
# =====================================================

@router.get("/bg-music-list")
def get_bg_music():

    files = []

    for file in os.listdir(BG_MUSIC_DIR):

        if file.endswith((".mp3", ".wav")):

            files.append(file)

    return {
        "music": files
    }

# =====================================================
# UPLOAD MUSIC
# =====================================================

@router.post("/upload-music")
async def upload_music(
    file: UploadFile = File(...)
):

    try:

        filename = f"{uuid.uuid4()}_{file.filename}"

        save_path = os.path.join(
            UPLOADED_MUSIC_DIR,
            filename
        )

        with open(save_path, "wb") as buffer:

            buffer.write(
                await file.read()
            )

        return {
            "status": "success",
            "file_path": save_path,
            "url": f"{BASE_URL}/uploaded_music/{filename}"
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =====================================================
# MAIN ENDPOINT
# =====================================================

@router.post("/generate-final-movie")
async def generate_final_movie(
    req: FinalMovieRequest
):

    log_debug("REQUEST", req.dict())

    try:

        rendered_scene_videos = []

        subtitles = []

        durations = []

        for i, scene in enumerate(req.scenes):

            log_debug(
                f"SCENE {i+1}",
                scene.dict()
            )

            audio_path = await generate_scene_audio(
                scene.subtitle,
                req.voice
            )

            audio_clip = AudioFileClip(audio_path)

            durations.append(audio_clip.duration)

            subtitles.append(scene.subtitle)

            output_path = os.path.join(
                FINAL_VIDEO_DIR,
                f"scene_{i+1}_{uuid.uuid4()}.mp4"
            )

            log_debug("OUTPUT", output_path)

            if req.animate:

                apply_subtitle_to_video(
                    scene.videoPath,
                    audio_path,
                    scene.subtitle,
                    output_path,
                    req.subtitle_text_color,
                    req.subtitle_bg_color
                )

            else:

                image_path = download_image_to_temp(
                    scene.image
                )

                create_video_from_image(
                    image_path,
                    audio_path,
                    scene.subtitle,
                    output_path,
                    req.subtitle_text_color,
                    req.subtitle_bg_color
                )

            rendered_scene_videos.append(
                output_path
            )

        srt_file = create_srt_file(
            subtitles,
            durations
        )

        final_video = merge_scene_videos(
            rendered_scene_videos
        )

        # =========================================
        # ADD BG MUSIC
        # =========================================

        music_path = None

        if req.selected_music:

            music_path = os.path.join(
                BG_MUSIC_DIR,
                req.selected_music
            )

        elif req.uploaded_music:

            music_path = req.uploaded_music

        if (
            music_path and
            os.path.exists(music_path)
        ):

            final_video = add_background_music(
                final_video,
                music_path,
                req.music_volume
            )

        # =========================================
        # AUTO DELETE
        # =========================================

        asyncio.create_task(
            auto_delete_file(
                final_video,
                DELETE_TIME
            )
        )

        asyncio.create_task(
            auto_delete_file(
                srt_file,
                DELETE_TIME
            )
        )

        for vid in rendered_scene_videos:

            asyncio.create_task(
                auto_delete_file(
                    vid,
                    DELETE_TIME
                )
            )

        return {
            "status": "completed",
            "download_url": f"{BASE_URL}/final_videos/{os.path.basename(final_video)}",
            "subtitle_file": f"{BASE_URL}/subtitles/{os.path.basename(srt_file)}"
        }

    except Exception as e:

        log_debug("ERROR", str(e))

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )