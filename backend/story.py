import os, shutil, uuid, json, requests
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

import edge_tts
from moviepy.editor import *
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# =========================
# LOAD ENV
# =========================
load_dotenv()
app = FastAPI()

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# =========================
# CONFIG
# =========================
DEFAULT_VOICE = os.getenv("DEFAULT_VOICE")

# =========================
# FONT CONFIG
# =========================
FONT_DIR = "fonts"

FONT_MAP = {
    f.split(".")[0].lower(): os.path.join(FONT_DIR, f)
    for f in os.listdir(FONT_DIR)
    if f.endswith(".ttf")
}

DEFAULT_FONT = "poppins-regular"

FONT_SIZE_MAP = {
    "small": 40,
    "medium": 60,
    "large": 80
}

DEFAULT_FONT_SIZE = "medium"

print("Loaded fonts:", FONT_MAP)

# =========================
# =========================
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://v0-zoop-v4.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# =========================
# DOWNLOAD HELPER
# =========================
def download_file(url, suffix):
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()

        path = f"{UPLOAD_DIR}/{uuid.uuid4()}.{suffix}"
        with open(path, "wb") as f:
            f.write(res.content)

        return path
    except:
        return None

# =========================
# TTS WITH TIMING
# =========================
async def get_tts_with_timings(text, path, voice, rate="+0%"):
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(path)

    audio = AudioFileClip(path)
    total_duration = audio.duration

    words = text.split()
    if not words:
        return [], audio

    base = total_duration / len(words)

    timings = []
    current = 0

    for w in words:
        duration = base * (0.9 if len(w) <= 3 else 1.1)

        if current + duration > total_duration:
            duration = total_duration - current

        if duration <= 0:
            break

        timings.append({
            "word": w,
            "start": current,
            "duration": duration
        })

        current += duration

    return timings, audio

# =========================
# 🎬 IMAGE ANIMATION ENGINE
# =========================
def apply_animation(clip, effect="zoom", duration=0.5):
    if effect == "none":
        return clip  # 🔥 NO ANIMATION

    if effect == "fade":
        return clip.fadein(duration).fadeout(duration)

    elif effect == "slide_left":
        return clip.set_position(lambda t: (-200 + 200*t, "center"))

    elif effect == "slide_right":
        return clip.set_position(lambda t: (200 - 200*t, "center"))

    elif effect == "zoom":
        return clip.resize(lambda t: 1 + 0.08*t)

    return clip
# =========================
# TEXT IMAGE
# =========================
def text_img(word, size, style):
    img = Image.new("RGBA", size, (0,0,0,0))
    draw = ImageDraw.Draw(img)

    font_name = style.get("font", DEFAULT_FONT).lower()
    font_size_key = style.get("font_size", DEFAULT_FONT_SIZE)

    font_path = FONT_MAP.get(font_name, FONT_MAP.get(DEFAULT_FONT))
    font_size = FONT_SIZE_MAP.get(font_size_key, 60)

    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception as e:
        print("Font error:", e)
        font = ImageFont.load_default()

    bbox = draw.textbbox((0,0), word, font=font)
    w, h = bbox[2], bbox[3]

    if style["align"] == "left":
        x = 50
    elif style["align"] == "right":
        x = size[0] - w - 50
    else:
        x = (size[0] - w)//2

    y = size[1] - 150

    draw.rectangle([x-10, y-10, x+w+10, y+h+10], fill=style["bg"])
    draw.text((x, y), word, font=font, fill=style["color"])

    return np.array(img)

# =========================
# SCENE (UPDATED WITH ANIMATION)
# =========================
def create_scene(images, words, audio, size, style, bg_music_path=None, bg_volume=0.2):
    total_duration = audio.duration

    clips = []
    per_img = total_duration / len(images)

    effect = style.get("effect", "zoom")  # 👈 default animation

    for img in images:
        clip = ImageClip(img).resize(size).set_duration(per_img)

        # 🔥 APPLY ANIMATION HERE
        clip = apply_animation(clip, effect)

        clips.append(clip)

    # 🔥 SMOOTH TRANSITIONS
    base = concatenate_videoclips(clips, method="compose", padding=-0.5)

    subs = []
    for w in words:
        if w["start"] >= total_duration:
            continue

        duration = min(w["duration"], total_duration - w["start"])

        txt = text_img(w["word"], size, style)

        subs.append(
            ImageClip(txt)
            .set_start(w["start"])
            .set_duration(duration)
        )

    final = CompositeVideoClip([base, *subs]).set_duration(total_duration)

    # AUDIO MIX
    if bg_music_path:
        bg_audio = AudioFileClip(bg_music_path).volumex(bg_volume)

        if bg_audio.duration < total_duration:
            bg_audio = afx.audio_loop(bg_audio, duration=total_duration)
        else:
            bg_audio = bg_audio.subclip(0, total_duration)

        final_audio = CompositeAudioClip([audio, bg_audio])
    else:
        final_audio = audio

    return final.set_audio(final_audio)

# =========================
# ROUTE
# =========================
@app.post("/generate")
async def generate(
    scenes: str = Form(...),
    aspect_ratio: str = Form(...),
    style: str = Form(...),
    voice: str = Form(None),
    speech_rate: str = Form("+0%"),
    bg_volume: float = Form(0.2),

    bg_music_url: str = Form(None),

    files: list[UploadFile] = File([]),
    bg_music: UploadFile = File(None)
):
    scenes = json.loads(scenes)
    style = json.loads(style)

    voice = voice if voice else DEFAULT_VOICE
    size = (720,1280) if aspect_ratio=="9:16" else (1280,720)

    final_clips = []
    file_index = 0

    bg_music_path = None

    if bg_music:
        bg_music_path = f"{UPLOAD_DIR}/{uuid.uuid4()}_{bg_music.filename}"
        with open(bg_music_path, "wb") as f:
            shutil.copyfileobj(bg_music.file, f)

    elif bg_music_url:
        bg_music_path = download_file(bg_music_url, "mp3")

    for i, scene in enumerate(scenes):
        text = scene["text"]
        count = scene.get("image_count", 0)
        image_urls = scene.get("image_urls", [])

        paths = []

        for _ in range(count):
            if file_index < len(files):
                file = files[file_index]
                file_index += 1

                path = f"{UPLOAD_DIR}/{uuid.uuid4()}.jpg"
                with open(path, "wb") as f:
                    shutil.copyfileobj(file.file, f)

                paths.append(path)

        for url in image_urls:
            img_path = download_file(url, "jpg")
            if img_path:
                paths.append(img_path)

        if not paths:
            continue

        audio_path = f"{OUTPUT_DIR}/audio_{i}.mp3"
        words, audio = await get_tts_with_timings(text, audio_path, voice, speech_rate)

        clip = create_scene(
            paths,
            words,
            audio,
            size,
            style,
            bg_music_path,
            bg_volume
        )

        final_clips.append(clip)

    if not final_clips:
        return {"error": "No valid scenes created"}

    video = concatenate_videoclips(final_clips, method="compose")

    out = f"{OUTPUT_DIR}/final.mp4"

    video.write_videofile(
        out,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        threads=2,
        preset="ultrafast"
    )

    return FileResponse(out, media_type="video/mp4")
