"use client";

import { useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function Page() {
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  // =====================================================
  // GENERATE VIDEO
  // =====================================================
  const handleGenerate = async () => {
    setLoading(true);
    setVideoUrl("");

    try {
      const res = await fetch(`${API_BASE}/animates/animates_video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: prompt,
          aspect_ratio: aspectRatio,
          resolution: "1080p",
          audio: false, // ALWAYS FALSE
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Something went wrong");
      }

      setVideoUrl(data.download_url);
    } catch (err) {
      console.error(err);
      alert("Failed to generate video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 selection:bg-purple-600 selection:text-white">

      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6">

        {/* TITLE */}
        <h1 className="text-3xl font-bold text-center mb-2">
          AI Image Animator
        </h1>

        <p className="text-center text-zinc-400 mb-6">
          Turn images into cinematic motion videos
        </p>

        {/* INPUTS */}
        <div className="space-y-4">

          {/* IMAGE URL */}
          <input
            className="w-full p-3 bg-black text-white border border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
            placeholder="Enter image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          {/* PROMPT */}
          <textarea
            className="w-full p-3 h-28 bg-black text-white border border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
            placeholder="Describe how the image should animate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          {/* ASPECT RATIO */}
          <select
            className="w-full p-3 bg-black text-white border border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
          </select>

          {/* BUTTON */}
          <button
            onClick={handleGenerate}
            disabled={loading || !imageUrl || !prompt}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-semibold disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Video"}
          </button>
        </div>

        {/* RESULT */}
        {videoUrl && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Result</h2>

            <video
              src={videoUrl}
              controls
              className="w-full rounded-xl border border-zinc-700"
            />
          </div>
        )}
      </div>
    </div>
  );
}