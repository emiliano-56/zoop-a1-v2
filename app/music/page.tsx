"use client";

import { useState, useEffect } from "react";

import {
  Wand2,
  ArrowLeft,
  Download,
  Music4,
  Disc3,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function Home() {

  const router = useRouter();

  const [stylePrompt, setStylePrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [duration, setDuration] = useState(90);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState("My Music");

  // =========================
  // GENERATE MUSIC
  // =========================
  const generateMusic = async () => {

    setLoading(true);

    setAudioUrl(null);

    try {

      const res = await fetch(
        "http://127.0.0.1:8000/music/music/generate-music",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            style_prompt: stylePrompt,
            lyrics,
            duration,
          }),
        }
      );

      const data = await res.json();

      if (data.task_id) {

        setTaskId(data.task_id);

      } else {

        setLoading(false);

        alert("Failed to create music task");
      }

    } catch (err) {

      console.error(err);

      setLoading(false);

      alert("Something went wrong");
    }
  };

  // =========================
  // DOWNLOAD AUDIO
  // =========================
  const downloadAudio = async () => {
    if (!audioUrl) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/music/music/download?audio_url=${encodeURIComponent(audioUrl)}`
      );

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle || "music"}.mp3`;

      document.body.appendChild(a);
      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download audio");
    }
  };

  // =========================
  // POLL STATUS
  // =========================
  useEffect(() => {

    if (!taskId) return;

    const interval = setInterval(async () => {

      try {

        const res = await fetch(
          `http://127.0.0.1:8000/music/music/task-status/${taskId}`
        );

        const data = await res.json();

        console.log(data);

        if (data.status === "completed") {

          setAudioUrl(data.audio_url);

          setLoading(false);

          clearInterval(interval);
        }

        if (
          data.status === "failed" ||
          data.status === "error"
        ) {

          setLoading(false);

          clearInterval(interval);

          alert("Music generation failed");
        }

      } catch (err) {

        console.error(err);
      }

    }, 3000);

    return () => clearInterval(interval);

  }, [taskId]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">

      {/* TOP BAR */}
      <div className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">

        {/* BACK */}
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2 text-zinc-300 hover:text-white transition-all"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        {/* PROJECT TITLE INPUT */}
        <input
          type="text"
          placeholder="Project Title"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="
          bg-zinc-950
          border
          border-zinc-800
          rounded-lg
          px-4
          py-2
          text-sm
          outline-none
          focus:border-purple-500
          transition-all
          w-48
          "
        />

      </div>

      {/* MAIN */}
      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-80px)]">

        {/* LEFT SIDE */}
        <div className="border-r border-zinc-900 p-8 overflow-y-auto">

          {/* HEADING */}
          <div className="mb-8">

            <div className="flex items-center gap-3 mb-3">

              <div className="bg-purple-600/20 p-3 rounded-2xl">
                <Disc3
                  className="text-purple-400"
                  size={24}
                />
              </div>

              <div>
                <h2 className="text-3xl font-bold">
                  Music Studio
                </h2>

                <p className="text-zinc-500 mt-1">
                  Describe your sound and generate AI music instantly.
                </p>
              </div>

            </div>

          </div>

          {/* STYLE PROMPT */}
          <div className="mb-6">

            <div className="flex items-center justify-between mb-3">

              <div className="flex items-center gap-2">

                <Wand2
                  size={18}
                  className="text-purple-400"
                />

                <label className="text-sm text-zinc-300 font-medium">
                  Style Prompt
                </label>

              </div>

              <span className="text-xs text-zinc-500">
                {stylePrompt.length} characters
              </span>

            </div>

            <textarea
              className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-5
              w-full
              h-52
              outline-none
              focus:border-purple-500
              transition-all
              resize-none
              "
              placeholder="Example:
Dark cinematic trap with emotional choir, distorted bass, atmospheric synths, studio-quality production, deep male vocals..."
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
            />

          </div>

          {/* LYRICS */}
          <div className="mb-6">

            <div className="flex items-center justify-between mb-3">

              <label className="text-sm text-zinc-300 font-medium">
                Lyrics
              </label>

              <span className="text-xs text-zinc-500">
                {lyrics.length} characters
              </span>

            </div>

            <textarea
              className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-5
              w-full
              h-72
              outline-none
              focus:border-purple-500
              transition-all
              resize-none
              "
              placeholder="Write or paste lyrics here..."
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
            />

          </div>

          {/* DURATION */}
          <div className="mb-8">

            <label className="block mb-3 text-sm text-zinc-300 font-medium">
              Duration (seconds)
            </label>

            <input
              type="number"
              className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-5
              w-full
              outline-none
              focus:border-purple-500
              "
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />

          </div>

          {/* BUTTON */}
          <button
            onClick={generateMusic}
            disabled={loading}
            className="
            w-full
            bg-purple-600
            hover:bg-purple-700
            transition-all
            rounded-2xl
            py-5
            font-semibold
            text-lg
            flex
            items-center
            justify-center
            "
          >

            {loading
              ? "Creating..."
              : "Create"}

          </button>

        </div>

        {/* CENTER / PREVIEW */}
        <div className="flex items-center justify-center p-8 relative">

          {/* BG EFFECT */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15),transparent_60%)]" />

          <div className="relative z-10 w-full max-w-xl">

            {/* PREVIEW CARD */}
            <div
              className="
              bg-zinc-950/80
              border
              border-zinc-800
              rounded-[30px]
              p-10
              backdrop-blur-xl
              "
            >

              <div className="flex flex-col items-center text-center">

                {/* ICON */}
                <div
                  className="
                  w-28
                  h-28
                  rounded-full
                  bg-purple-600/20
                  flex
                  items-center
                  justify-center
                  mb-8
                  border
                  border-purple-500/20
                  "
                >

                  <Music4
                    size={48}
                    className="text-purple-400"
                  />

                </div>

                {/* TITLE */}
                <h2 className="text-3xl font-bold mb-3">
                  Audio Preview
                </h2>

                <p className="text-zinc-500 mb-10 max-w-md">
                  Your AI-generated soundtrack will appear here
                  once generation is complete.
                </p>

                {/* LOADING */}
                {loading && (

                  <div className="mb-8 text-purple-400 animate-pulse">
                    Creating your masterpiece...
                  </div>

                )}

                {/* AUDIO */}
                {audioUrl ? (

                  <div className="w-full">

                    <audio
                      controls
                      className="w-full mb-6"
                    >
                      <source src={audioUrl} />
                    </audio>

                    {/* DOWNLOAD */}
                    <button
                      onClick={downloadAudio}
                      className="
                      flex
                      items-center
                      justify-center
                      gap-3
                      bg-white
                      text-black
                      rounded-2xl
                      py-4
                      font-semibold
                      hover:scale-[1.02]
                      transition-all
                      w-full
                      "
                    >

                      <Download size={20} />

                      Download Audio

                    </button>

                  </div>

                ) : (

                  <div
                    className="
                    border
                    border-dashed
                    border-zinc-800
                    rounded-2xl
                    p-14
                    w-full
                    "
                  >

                    <p className="text-zinc-600">
                      No generated audio yet
                    </p>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
