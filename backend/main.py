from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# =====================================================
# IMPORT MINI APPS
# =====================================================

from nano import app as nano_app
from text_video import app as text_video_app
from img_video import app as img_video_app
from story import app as story_app
from image import app as image_app
from music import app as music_app
from qwen import app as qwen_app
from animates import app as animates_app
from coloring import app as coloring_app
from comic import app as comic_app
from story_line import app as story_line_app

from story_line_videos import router as story_line_videos_router
from story_subtitles import router as story_subtitles_router

# =====================================================
# MAIN APP
# =====================================================

app = FastAPI()

# =====================================================
# CORS
# =====================================================

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# STATIC FILE SERVING
# =====================================================

# FINAL VIDEOS
app.mount(
    "/final_videos",
    StaticFiles(directory="final_videos"),
    name="final_videos"
)

# AUDIO
app.mount(
    "/audio",
    StaticFiles(directory="audio"),
    name="audio"
)

# SUBTITLES
app.mount(
    "/subtitles",
    StaticFiles(directory="subtitles"),
    name="subtitles"
)

# BG MUSIC
app.mount(
    "/bg_music",
    StaticFiles(directory="bg_music"),
    name="bg_music"
)

# UPLOADED MUSIC
app.mount(
    "/uploaded_music",
    StaticFiles(directory="uploaded_music"),
    name="uploaded_music"
)

# TEMP ASSETS
app.mount(
    "/temp_assets",
    StaticFiles(directory="temp_assets"),
    name="temp_assets"
)

# =====================================================
# MOUNT APPS
# =====================================================

app.mount("/nano", nano_app)
app.mount("/text-video", text_video_app)
app.mount("/img-video", img_video_app)
app.mount("/story", story_app)
app.mount("/image", image_app)
app.mount("/music", music_app)
app.mount("/qwen", qwen_app)
app.mount("/animates", animates_app)
app.mount("/coloring", coloring_app)
app.mount("/comic", comic_app)
app.mount("/story-line", story_line_app)

# =====================================================
# ROUTERS
# =====================================================

app.include_router(
    story_line_videos_router,
    prefix="/story-line-videos",
    tags=["Story Line Videos"]
)

app.include_router(
    story_subtitles_router,
    prefix="/story-subtitles",
    tags=["Story Subtitles"]
)

# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():
    return {
        "message": "Main API running",
        "services": {
            "story_line_videos": "/story-line-videos",
            "story_subtitles": "/story-subtitles"
        },
        "static": {
            "final_videos": "/final_videos",
            "audio": "/audio",
            "subtitles": "/subtitles",
            "bg_music": "/bg_music",
            "uploaded_music": "/uploaded_music",
            "temp_assets": "/temp_assets"
        }
    }