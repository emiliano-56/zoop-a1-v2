"use client";

import { useState, useRef } from "react";

const API_BASE = "http://127.0.0.1:8000";

type Scene = {
  image_base64: string;
  image_url: string;
  mime_type: string;
  prompt: string;
  subtitle: string;
};

export default function Page() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [scenes, setScenes] = useState<Scene[]>([
    {
      image_base64: "",
      image_url: "",
      mime_type: "image/jpeg",
      prompt: "",
      subtitle: "",
    },
  ]);

  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voice, setVoice] = useState("en-US-AriaNeural");

  // GLOBAL STYLING
  const [textColor, setTextColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#000000");

  // BACKGROUND MUSIC
  const [bgMusic, setBgMusic] = useState<string>("");
  const [bgMusicUrl, setBgMusicUrl] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  // =====================================================
  // HANDLE SCENE CHANGE
  // =====================================================

  const updateScene = (
    index: number,
    field: keyof Scene,
    value: string
  ) => {
    const updated = [...scenes];
    updated[index][field] = value;
    setScenes(updated);
  };

  // =====================================================
  // IMAGE UPLOAD
  // =====================================================

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;

      const pureBase64 = base64String.split(",")[1];

      const updated = [...scenes];

      updated[index].image_base64 = pureBase64;
      updated[index].mime_type = file.type;
      updated[index].image_url = "";

      setScenes(updated);
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // IMPORT IMAGE FROM URL
  // =====================================================

  const handleImportFromUrl = async (index: number) => {
    const url = scenes[index].image_url;

    if (!url) {
      alert("Please enter image URL");
      return;
    }

    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error();
      }

      const blob = await res.blob();

      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;

        const pureBase64 = base64String.split(",")[1];

        const updated = [...scenes];

        updated[index].image_base64 = pureBase64;
        updated[index].mime_type = blob.type || "image/jpeg";

        setScenes(updated);
      };

      reader.readAsDataURL(blob);

    } catch {
      alert("Failed to import image");
    }
  };

  // =====================================================
  // MUSIC UPLOAD
  // =====================================================

  const handleMusicUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;

      const pureBase64 = base64String.split(",")[1];

      setBgMusic(pureBase64);

      // PREVIEW URL
      const objectUrl = URL.createObjectURL(file);

      setBgMusicUrl(objectUrl);
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // PLAY / PAUSE MUSIC PREVIEW
  // =====================================================

  const toggleMusicPreview = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  // =====================================================
  // ADD SCENE
  // =====================================================

  const addScene = () => {
    setScenes([
      ...scenes,
      {
        image_base64: "",
        image_url: "",
        mime_type: "image/jpeg",
        prompt: "",
        subtitle: "",
      },
    ]);
  };

  // =====================================================
  // REMOVE SCENE
  // =====================================================

  const removeScene = (index: number) => {
    setScenes(
      scenes.filter((_, i) => i !== index)
    );
  };

  // =====================================================
  // GENERATE STORY
  // =====================================================

  const handleGenerate = async () => {
    setLoading(true);

    setVideoUrl("");

    try {
      const res = await fetch(
        `${API_BASE}/animates/animates_story`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            scenes,
            voice,
            aspect_ratio: aspectRatio,
            resolution: "1080p",

            text_color: textColor,
            bg_color: bgColor,

            bg_music_base64: bgMusic || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail);
      }

      setVideoUrl(data.download_url);

    } catch (err) {
      console.error(err);

      alert("Failed to generate story");

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DOWNLOAD VIDEO
  // =====================================================

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `ai_story_${Date.now()}.mp4`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);

      alert("Download failed");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6">

        <h1 className="text-3xl font-bold text-center mb-2">
          AI Story Animator
        </h1>

        {/* ================= GLOBAL SETTINGS ================= */}

        <div className="space-y-4 mb-6">

          {/* ASPECT RATIO */}
          <select
            className="w-full p-3 bg-black border border-zinc-700 rounded-lg"
            value={aspectRatio}
            onChange={(e) =>
              setAspectRatio(e.target.value)
            }
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>

          {/* VOICE */}
          <select
            className="w-full p-3 bg-black border border-zinc-700 rounded-lg"
            value={voice}
            onChange={(e) =>
              setVoice(e.target.value)
            }
          >
            <option value="en-US-AriaNeural">
              Aria
            </option>

            <option value="en-US-GuyNeural">
              Guy
            </option>

            <option value="en-GB-LibbyNeural">
              Libby
            </option>
          </select>

          {/* COLORS */}
          <div className="flex gap-3">

            <div className="w-full">
              <label className="text-sm text-zinc-400 mb-1 block">
                Text Color
              </label>

              <input
                type="color"
                value={textColor}
                onChange={(e) =>
                  setTextColor(e.target.value)
                }
                className="w-full h-12"
              />
            </div>

            <div className="w-full">
              <label className="text-sm text-zinc-400 mb-1 block">
                Subtitle Background
              </label>

              <input
                type="color"
                value={bgColor}
                onChange={(e) =>
                  setBgColor(e.target.value)
                }
                className="w-full h-12"
              />
            </div>
          </div>

          {/* MUSIC */}
          <div className="space-y-3">

            <input
              type="file"
              accept="audio/*"
              onChange={handleMusicUpload}
              className="w-full p-2 bg-black border border-zinc-700 rounded-lg"
            />

            {/* AUDIO PREVIEW */}
            {bgMusicUrl && (
              <div className="flex items-center gap-3">

                <audio
                  ref={audioRef}
                  src={bgMusicUrl}
                  loop
                />

                <button
                  onClick={toggleMusicPreview}
                  className="bg-purple-600 px-4 py-2 rounded-lg"
                >
                  Play / Pause Music
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= SCENES ================= */}

        {scenes.map((scene, index) => (
          <div
            key={index}
            className="border border-zinc-800 p-4 rounded-xl mb-4"
          >

            {/* URL IMPORT */}
            <div className="flex gap-2 mb-2">

              <input
                placeholder="Image URL"
                value={scene.image_url}
                onChange={(e) =>
                  updateScene(
                    index,
                    "image_url",
                    e.target.value
                  )
                }
                className="flex-1 p-3 bg-black border border-zinc-700 rounded-lg"
              />

              <button
                onClick={() =>
                  handleImportFromUrl(index)
                }
                className="px-4 bg-purple-600 rounded-lg"
              >
                Import
              </button>
            </div>

            {/* FILE UPLOAD */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleImageUpload(e, index)
              }
              className="w-full mb-2"
            />

            {/* PREVIEW */}
            {scene.image_base64 && (
              <img
                src={`data:${scene.mime_type};base64,${scene.image_base64}`}
                className="w-full rounded-lg mb-2"
              />
            )}

            {/* PROMPT */}
            <textarea
              placeholder="Prompt"
              value={scene.prompt}
              onChange={(e) =>
                updateScene(
                  index,
                  "prompt",
                  e.target.value
                )
              }
              className="w-full p-3 bg-black border border-zinc-700 rounded-lg mb-2"
            />

            {/* SUBTITLE */}
            <textarea
              placeholder="Subtitle"
              value={scene.subtitle}
              onChange={(e) =>
                updateScene(
                  index,
                  "subtitle",
                  e.target.value
                )
              }
              className="w-full p-3 bg-black border border-zinc-700 rounded-lg"
            />

            {/* REMOVE */}
            {scenes.length > 1 && (
              <button
                onClick={() =>
                  removeScene(index)
                }
                className="mt-3 bg-red-600 px-4 py-2 rounded-lg"
              >
                Remove Scene
              </button>
            )}
          </div>
        ))}

        {/* ADD SCENE */}

        <button
          onClick={addScene}
          className="w-full border border-dashed border-zinc-600 py-2 rounded-lg mb-4"
        >
          + Add Scene
        </button>

        {/* GENERATE */}

        <button
          onClick={handleGenerate}
          disabled={
            loading ||
            scenes.some(
              (s) =>
                !s.image_base64 ||
                !s.prompt ||
                !s.subtitle
            )
          }
          className="w-full bg-purple-600 py-3 rounded-lg"
        >
          {loading
            ? "Generating..."
            : "Generate Story"}
        </button>

        {/* RESULT */}

        {videoUrl && (
          <div className="mt-6 space-y-4">

            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg"
            />

            {/* DOWNLOAD BUTTON */}
            <button
              onClick={handleDownload}
              className="w-full bg-green-600 py-3 rounded-lg font-semibold"
            >
              Download Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}