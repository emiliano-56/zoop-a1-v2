"use client";

import { useState } from "react";
import { Save, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

/* =====================================================
   MESSAGE TYPES
===================================================== */
type Message =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "ai";
      image: string;
    };

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  /* =====================================================
     ASPECT RATIO STATE
  ===================================================== */
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");

  /* =====================================================
     DOWNLOAD IMAGE (FIXED - NO NEW TAB)
  ===================================================== */
  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/qwen/download?url=${encodeURIComponent(url)}`
      );

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "ai-image.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.log("❌ Download failed:", err);
    }
  };

  /* =====================================================
     SEND MESSAGE
  ===================================================== */
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    setLoading(true);

    try {
      const endpoint = currentImage
        ? "http://127.0.0.1:8000/qwen/edit-image"
        : "http://127.0.0.1:8000/qwen/generate-image";

      const payload = currentImage
        ? {
            image_url: currentImage,
            instruction: userMessage,
          }
        : {
            prompt: userMessage,
            aspect_ratio: aspectRatio, // ✅ NEW
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log("📦 API RESPONSE:", data);

      const imageUrl: string = data.image_url;

      if (!imageUrl) {
        console.log("❌ No image_url returned");
        setLoading(false);
        return;
      }

      setCurrentImage(imageUrl);

      setMessages((prev) => [
        ...prev,
        { role: "ai", image: imageUrl },
      ]);
    } catch (err) {
      console.log("❌ Error:", err);
    }

    setLoading(false);
  };

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6">

      {/* BACK TO HOME BUTTON */}
      <Link
        href="/home"
        className="self-start mb-6 bg-purple-600 hover:bg-purple-700 transition text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
      >
        <ArrowLeft size={18} />
        Back to home
      </Link>

      {/* HEADER */}
      <div className="text-center mb-5">
        <h1 className="text-3xl font-bold">AI Image Chat Studio</h1>
        <p className="text-white text-sm mt-1">
          Create & evolve images like a conversation
        </p>
      </div>

      {/* ASPECT RATIO SELECTOR */}
      <div className="flex gap-2 mb-4 items-center">
        {["1:1", "16:9", "9:16", "4:3"].map((ratio) => (
          <button
            key={ratio}
            onClick={() => setAspectRatio(ratio)}
            className={`px-3 py-1 rounded-full text-sm border transition ${
              aspectRatio === ratio
                ? "bg-purple-600 text-white"
                : "border-white/20 text-white"
            }`}
          >
            {ratio}
          </button>
        ))}
        <button
          onClick={() => {}}
          className="bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition"
          title="Save aspect ratio"
        >
          <Save size={16} />
        </button>
      </div>

      {/* CHAT */}
      <div className="w-full max-w-2xl bg-black rounded-2xl p-5 h-[360px] overflow-y-auto space-y-4 border border-white/10 shadow-xl">

        {messages.map((msg, i) => (
          <div key={i}>

            {/* USER MESSAGE */}
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2 rounded-2xl max-w-[70%] text-sm font-normal text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              /* AI IMAGE CARD */
              <div className="flex justify-start group relative">

                <div className="relative bg-black p-2 rounded-2xl shadow-lg border border-white/10">

                  {/* IMAGE */}
                  <img
                    src={msg.image}
                    alt="generated"
                    className="rounded-xl max-w-[320px]"
                  />

                  {/* HOVER OVERLAY - TOP BORDER */}
                  <div className="absolute -top-3 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">

                    <button
                      onClick={() => downloadImage(msg.image)}
                      className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition flex items-center justify-center shadow-lg border border-purple-400/30"
                      title="Download image"
                    >
                      <Download size={18} />
                    </button>

                    <button
                      onClick={() => {}}
                      className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition flex items-center justify-center shadow-lg border border-purple-400/30"
                      title="Save image"
                    >
                      <Save size={18} />
                    </button>

                  </div>

                </div>

              </div>
            )}
          </div>
        ))}

        {/* LOADING */}
        {loading && (
          <div className="text-white text-sm animate-pulse">
            Creating your image...
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="flex w-full max-w-2xl mt-6 gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={
            currentImage
              ? "Edit this image..."
              : "Describe your image..."
          }
          className="flex-1 p-4 rounded-2xl bg-black outline-none border border-white/10 focus:border-purple-600 transition text-white"
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 transition px-6 py-4 rounded-2xl font-semibold disabled:opacity-50 text-white"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
