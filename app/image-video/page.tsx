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
  const [imageBase64, setImageBase64] = useState("")
  const [mimeType, setMimeType] = useState("image/jpeg")

  const [cameraMovement, setCameraMovement] = useState("")
  const [tone, setTone] = useState("")

  const cameraMovements = [
    "camera move-cinematic",
    "camera move-slow-pan",
    "camera move-fast-zoom",
    "camera move-orbit",
    "camera move-dolly-in",
    "camera move-dolly-out",
  ]

  const tones = [
    "tone-dramatic",
    "tone-cinematic",
    "tone-cheerful",
    "tone-melancholic",
    "tone-epic",
    "tone-subtle",
  ]

  const handleCameraMovementSelect = (movement: string) => {
    setCameraMovement(movement)
    setPrompt((prev) => prev + (prev ? " " : "") + movement)
  }

  const handleToneSelect = (selectedTone: string) => {
    setTone(selectedTone)
    setPrompt((prev) => prev + (prev ? " " : "") + selectedTone)
  }

  const handleGenerate = async () => {
    if (!prompt) return

    setLoading(true)
    setError("")
    setVideoUrl("")

    try {
      const res = await fetch("http://127.0.0.1:8000/img-video/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          audio,
          resolution,
          aspect_ratio: aspectRatio,
          duration_type: durationType,
          image_base64: imageBase64,
          mime_type: mimeType,
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
    <div className="min-h-screen bg-black text-white flex flex-col px-6 py-8">
      <h1 className="text-3xl font-semibold mb-8">Image → Video Generator</h1>

      <div className="flex gap-8 flex-1">
        {/* Left Panel - Controls */}
        <div className="flex-1 max-w-2xl space-y-6">
          {/* Textarea */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Prompt</label>
              <span className="text-xs text-gray-400">{prompt.length} characters</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image-to-video scene..."
              className="w-full h-40 p-4 bg-black border border-gray-600 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Image</label>
            {imageBase64 ? (
              <div className="space-y-3">
                <div className="relative w-32">
                  <div className="w-32 rounded-xl border border-gray-600 overflow-hidden bg-gray-900">
                    <img
                      src={`data:${mimeType};base64,${imageBase64}`}
                      alt="Preview"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <button
                    onClick={() => setImageBase64("")}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition"
                  >
                    ×
                  </button>
                </div>
                <label className="block px-4 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-600 rounded-xl cursor-pointer transition text-center text-sm text-white">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setMimeType(file.type)
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        const result = reader.result as string
                        const base64 = result.split(",")[1]
                        setImageBase64(base64)
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="hidden"
                  />
                  Change Image
                </label>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-purple-500 rounded-xl cursor-pointer hover:bg-purple-900 hover:bg-opacity-20 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setMimeType(file.type)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      const result = reader.result as string
                      const base64 = result.split(",")[1]
                      setImageBase64(base64)
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="hidden"
                />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-300">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                </div>
              </label>
            )}
          </div>

          {/* Camera Movements and Tone - 2 Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Camera Movements */}
            <div>
              <label className="block text-sm font-medium mb-2">Camera Movements</label>
              <select
                value={cameraMovement}
                onChange={(e) => handleCameraMovementSelect(e.target.value)}
                className="w-full bg-black border border-gray-600 p-2 rounded text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
              >
                <option value="">Select camera...</option>
                {cameraMovements.map((movement) => (
                  <option key={movement} value={movement}>
                    {movement}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => handleToneSelect(e.target.value)}
                className="w-full bg-black border border-gray-600 p-2 rounded text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
              >
                <option value="">Select tone...</option>
                {tones.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-black border border-gray-600 p-2 rounded text-white"
              >
                <option value="720p">720P</option>
                <option value="1080p">1080P</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-black border border-gray-600 p-2 rounded text-white"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value)}
                className="w-full bg-black border border-gray-600 p-2 rounded text-white"
              >
                <option value="8s">Quick (8s)</option>
                <option value="30s">Pro (30s)</option>
                <option value="56s">Premium (56s)</option>
              </select>
            </div>
          </div>

          {/* Audio Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Audio</label>
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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:opacity-50 text-white font-semibold rounded-xl transition duration-200"
          >
            {loading ? "Generating..." : "Generate Video"}
          </button>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Right Panel - Video Preview */}
        <div className="flex-1 max-w-2xl">
          {videoUrl ? (
            <div className="space-y-4">
              {/* Download Button */}
              <a
                href={videoUrl}
                download
                className="block w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-center transition"
              >
                Download
              </a>

              {/* Video Preview */}
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl border border-gray-600"
              />

              {/* History */}
              <div className="mt-6 pt-6 border-t border-gray-600">
                <h3 className="text-lg font-semibold mb-4">History</h3>
                <p className="text-gray-400 text-sm">Your generated videos will appear here</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 border border-gray-600 rounded-xl">
              <p className="text-gray-400">Video preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
