from fastapi import FastAPI

# import all your mini apps
from nano import app as nano_app
from text_video import app as text_video_app
from img_video import app as img_video_app
from story import app as story_app
# future ones
# from user import app as user_app
# from auth import app as auth_app

app = FastAPI()

# mount everything
app.mount("/nano", nano_app)
app.mount("/text-video", text_video_app)
app.mount("/img-video", img_video_app)
app.mount("/story", story_app)

@app.get("/")
def root():
    return {
        "message": "Main API running",
        "services": {
            "image": "/nano",
            "text_to_video": "/text-video",
            "image_to_video": "/img-video",
            "story_generation": "/story",
        }
    }