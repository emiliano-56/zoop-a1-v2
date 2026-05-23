from fastapi import FastAPI

# import all your mini apps
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
# future ones
# from user import app as user_app
# from auth import app as auth_app

app = FastAPI()

# mount everything
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
@app.get("/")
def root():
    return {
        "message": "Main API running",
        "services": {
            "image": "/nano",
            "text_to_video": "/text-video",
            "image_to_video": "/img-video",
            "story_generation": "/story",
            "image_management": "/image",
            "music_generation": "/music",
            "qwen_image_generation": "/qwen", 
            "fast_image_animation": "/animates",
            "coloring": "/coloring",
            "comic": "/comic"
           
          
        }
    }