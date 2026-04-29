"use client"

import { useState } from "react"

export default function Page() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [error, setError] = useState("")

  const [resolution, setResolution] = useState("1080p")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [durationType, setDurationType] = useState("8s")
  const [audio, setAudio] = useState(true)

  const [cameraMovement, setCameraMovement] = useState("static shot")
  const [motion, setMotion] = useState("natural motion")
  const [style, setStyle] = useState("cinematic")

  const buildPrompt = () => {
    return `
${prompt}
`
  }

  // 🔥 helper to update or insert line
  const updatePromptLine = (label: string, value: string) => {
    setPrompt((prev) => {
      const regex = new RegExp(`${label}:.*`, "i")

      if (regex.test(prev)) {
        return prev.replace(regex, `${label}: ${value}`)
      } else {
        return `${label}: ${value}\n${prev}`
      }
    })
  }

  const handleGenerate = async () => {
    if (!prompt) return

    setLoading(true)
    setError("")
    setVideoUrl("")

    try {
      const res = await fetch("https://zoop-a1-v2.onrender.com/text-video/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: buildPrompt(),
          audio,
          resolution,
          aspect_ratio: aspectRatio,
          duration_type: durationType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || "Generation failed")
      }

      setVideoUrl(data.download_url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">

      <h1 className="text-3xl font-semibold mb-8">Text → Video Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* LEFT SIDE */}
        <div>

          {/* PROMPT */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video..."
            className="w-full h-32 p-4 bg-black border border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-600"
          />

          {/* SETTINGS */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Settings</h2>

            <div className="grid grid-cols-2 gap-4">

              {/* STYLE */}
              <div>
                <label className="text-sm text-gray-400">Style</label>
                <select
                  value={style}
                  onChange={(e) => {
                    const value = e.target.value
                    setStyle(value)
                    updatePromptLine("Style", value)
                  }}
                  className="w-full mt-1 p-2 bg-black border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="realistic">Realistic</option>
                  <option value="anime">Anime</option>
                  <option value="3d animation">3D Animation</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="documentary">Documentary</option>
                </select>
              </div>

              {/* CAMERA */}
              <div>
                <label className="text-sm text-gray-400">Camera</label>
                <select
                  value={cameraMovement}
                  onChange={(e) => {
                    const value = e.target.value
                    setCameraMovement(value)
                    updatePromptLine("Camera movement", value)
                  }}
                  className="w-full mt-1 p-2 bg-black border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="static shot">Static Shot</option>
                  <option value="slow zoom in">Slow Zoom In</option>
                  <option value="slow zoom out">Slow Zoom Out</option>
                  <option value="drone shot">Drone Shot</option>
                  <option value="handheld camera">Handheld Camera</option>
                  <option value="tracking shot">Tracking Shot</option>
                </select>
              </div>

              {/* MOTION */}
              <div>
                <label className="text-sm text-gray-400">Motion</label>
                <select
                  value={motion}
                  onChange={(e) => {
                    const value = e.target.value
                    setMotion(value)
                    updatePromptLine("Motion", value)
                  }}
                  className="w-full mt-1 p-2 bg-black border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="natural motion">Natural Motion</option>
                  <option value="slow motion">Slow Motion</option>
                  <option value="fast motion">Fast Motion</option>
                  <option value="dramatic motion">Dramatic Motion</option>
                  <option value="smooth motion">Smooth Motion</option>
                </select>
              </div>

              {/* RESOLUTION */}
              <div>
                <label className="text-sm text-gray-400">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full mt-1 p-2 bg-black border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="720p">720P</option>
                  <option value="1080p">1080P</option>
                </select>
              </div>

              {/* ASPECT */}
              <div>
                <label className="text-sm text-gray-400">Aspect</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full mt-1 p-2 bg-black border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>

              {/* DURATION */}
              <div>
                <label className="text-sm text-gray-400">Duration</label>
                <select
                  value={durationType}
                  onChange={(e) => setDurationType(e.target.value)}
                  className="w-full mt-1 p-2 bg-black border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="8s">8s</option>
                  <option value="30s">30s</option>
                  <option value="56s">56s</option>
                </select>
              </div>

            </div>
          </div>

          {/* AUDIO */}
          <div className="flex items-center gap-3 mt-6">
            <span className="text-gray-300">Audio</span>
            <button
              onClick={() => setAudio(!audio)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                audio ? "bg-purple-600" : "bg-gray-600"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full transform transition ${
                  audio ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* GENERATE */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 transition rounded-xl font-medium"
          >
            {loading ? "Generating..." : "Generate Video"}
          </button>

          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>

        {/* RIGHT SIDE */}
        <div>

          <div className="bg-black border border-gray-700 rounded-2xl p-4 min-h-[300px] flex flex-col">

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-300">Preview</h2>

              {videoUrl && (
                <a
                  href={videoUrl}
                  download
                  className="px-4 py-2 bg-purple-600 rounded-lg text-sm"
                >
                  Download Video
                </a>
              )}
            </div>

            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl border border-gray-800"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                No video generated yet
              </div>
            )}
          </div>

          {/* HISTORY */}
          <div className="mt-6 bg-black border border-gray-700 rounded-2xl p-4">
            <h2 className="text-gray-300 mb-2">History</h2>
            <p className="text-gray-500 text-sm">
              Previous generations will appear here
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}