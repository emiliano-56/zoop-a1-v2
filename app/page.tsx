"use client";

import { useState } from "react";

export default function Page() {
  const BASE_URL = "http://127.0.0.1:8000";

  const [mainQuestion, setMainQuestion] = useState("");
  const [ctaQuestion, setCtaQuestion] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [aspect, setAspect] = useState("9:16");
  const [bgColor, setBgColor] = useState("#000000");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  // ---------------- IMAGE UPLOAD ----------------
  const handleImageUpload = async (e: any) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > 5) {
      alert("Max 5 images allowed");
      return;
    }

    const base64Images = await Promise.all(
      files.map(
        (file: any) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
          })
      )
    );

    setImages((prev) => [...prev, ...base64Images]);
  };

  // ---------------- REMOVE IMAGE ----------------
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // ---------------- GENERATE VIDEO ----------------
  const generateVideo = async () => {
    if (!mainQuestion.trim()) {
      alert("Main question is required");
      return;
    }

    setLoading(true);
    setVideoUrl("");

    try {
      const res = await fetch(`${BASE_URL}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          main_question: mainQuestion,
          cta_question: ctaQuestion,
          screenshots: images,
          aspect_ratio: aspect,
          bg_color: bgColor,
        }),
      });

      const data = await res.json();

      if (data.video_url) {
        const fullUrl = data.video_url.startsWith("http")
          ? data.video_url
          : `${BASE_URL}${data.video_url}`;

        setVideoUrl(fullUrl);

        // scroll to video
        setTimeout(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        }, 500);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Check backend.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      <h1 className="text-2xl font-bold">Story Video Generator</h1>

      {/* ---------------- LIVE PREVIEW ---------------- */}
      <div
        className="p-6 rounded text-white text-center"
        style={{ backgroundColor: bgColor }}
      >
        <h2 className="text-xl font-semibold">
          {mainQuestion || "Your question preview"}
        </h2>
      </div>

      {/* ---------------- QUESTION INPUT ---------------- */}
      <input
        className="border p-2 w-full"
        placeholder="Enter main question..."
        value={mainQuestion}
        onChange={(e) => setMainQuestion(e.target.value)}
      />

      {/* ---------------- BG COLOR ---------------- */}
      <div className="flex items-center gap-3">
        <label>Background:</label>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
        />
      </div>

      {/* ---------------- ASPECT RATIO ---------------- */}
      <div className="flex gap-3">
        <button
          onClick={() => setAspect("9:16")}
          className={`px-3 py-1 border ${aspect === "9:16" ? "bg-black text-white" : ""}`}
        >
          9:16
        </button>

        <button
          onClick={() => setAspect("16:9")}
          className={`px-3 py-1 border ${aspect === "16:9" ? "bg-black text-white" : ""}`}
        >
          16:9
        </button>
      </div>

      {/* ---------------- IMAGE UPLOAD ---------------- */}
      <input type="file" multiple accept="image/*" onChange={handleImageUpload} />

      {/* ---------------- IMAGE PREVIEW ---------------- */}
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative">
            <img src={img} className="h-28 w-full object-cover rounded" />

            <button
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 bg-black text-white text-xs px-1 rounded"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ---------------- CTA ---------------- */}
      <input
        className="border p-2 w-full"
        placeholder="CTA question..."
        value={ctaQuestion}
        onChange={(e) => setCtaQuestion(e.target.value)}
      />

      {/* ---------------- GENERATE BUTTON ---------------- */}
      <button
        onClick={generateVideo}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded w-full flex items-center justify-center gap-2"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? "Generating video..." : "Generate MP4"}
      </button>

      {/* ---------------- LOADING TEXT ---------------- */}
      {loading && (
        <p className="text-sm text-gray-500 text-center">
          This may take 10–30 seconds...
        </p>
      )}

      {/* ---------------- VIDEO OUTPUT ---------------- */}
      {videoUrl && (
        <div className="space-y-3">
          <video
            src={videoUrl}
            controls
            className="w-full rounded"
          />

          <a
            href={videoUrl}
            download="story-video.mp4"
            className="block text-center bg-blue-600 text-white py-2 rounded"
          >
            Download MP4
          </a>
        </div>
      )}
    </div>
  );
}