"use client"

import { useEffect, useState } from "react"
import { Wand2, Save, Library, Film, ArrowLeft } from "lucide-react"

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

  const [imageUrl, setImageUrl] = useState("")
  const [importLoading, setImportLoading] = useState(false)

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

  const handleImageUrlImport = async () => {
    if (!imageUrl) return

    try {
      setImportLoading(true)

      const res = await fetch("http://127.0.0.1:8000/image/import-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: imageUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || "Failed to import image")
      }

      setImageBase64(data.image_base64)
      setMimeType(data.mime_type)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setImportLoading(false)
    }
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
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => window.location.href = '/home'}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </div>

      {/* Center Title */}
     <div className="flex flex-col items-center justify-center mb-24 text-center">
  <h1 className="text-5xl font-bold tracking-tight">
    Create Magic
  </h1>

  <p className="text-gray-400 mt-4 max-w-2xl text-lg leading-relaxed">
    Turn your ideas into cinematic AI-generated videos with powerful motion,
    storytelling, and studio-quality visuals.
  </p>
</div>

      {/* Main Layout */}
      <div className="flex gap-10 flex-1 items-start">
        
        {/* Left Panel - Input Section */}
        <div className="flex-1 max-w-md space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Creation</h2>
          </div>

          {/* Prompt Textarea with Icons */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Prompt</label>
              <span className="text-xs text-gray-400">
                {prompt.length} characters
              </span>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your image-to-video scene..."
                className="w-full h-40 p-4 pr-12 bg-black border border-gray-600 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
              />

              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  title="Magic"
                  className="p-1 hover:bg-purple-600 rounded transition text-gray-400 hover:text-white"
                >
                  <Wand2 size={16} />
                </button>

                <button
                  title="Save"
                  className="p-1 hover:bg-purple-600 rounded transition text-gray-400 hover:text-white"
                >
                  <Save size={16} />
                </button>

                <button
                  title="Library"
                  className="p-1 hover:bg-purple-600 rounded transition text-gray-400 hover:text-white"
                >
                  <Library size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Image
            </label>

            {imageBase64 ? (
              <div className="space-y-3">
                <div className="relative w-32">
                  <div className="w-32 rounded-xl border border-gray-600 overflow-hidden bg-black">
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
                  <p className="text-sm font-medium text-gray-300">
                    Click to upload or drag and drop
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Import Image From URL */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Import Image URL
            </label>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-black border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />

              <button
                onClick={handleImageUrlImport}
                disabled={importLoading}
                className="px-5 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition"
              >
                {importLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>

        {/* Center Video Preview */}
        <div className="flex-1 flex items-start justify-center pt-24 min-h-[700px]">
          {videoUrl ? (
            <div className="w-full max-w-2xl space-y-4">
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
                className="w-full rounded-2xl border border-[#1f2937] shadow-2xl"
              />

              {/* History */}
              <div className="mt-6 pt-6 border-t border-[#1f2937]">
                <h3 className="text-lg font-semibold mb-4">History</h3>

                <p className="text-gray-400 text-sm">
                  Your generated videos will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <Film size={64} className="mb-4 text-purple-500" />

              <h2 className="text-2xl font-bold mb-2">
                Your masterpiece awaits here
              </h2>

              <p className="text-gray-500 text-sm mt-2">
                Generate a video to see the magic happen
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Settings Section */}
        <div className="flex-1 max-w-md space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
          </div>

          {/* Camera Movements and Tone */}
          <div className="grid grid-cols-2 gap-4">
            {/* Camera Movements */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Camera Movements
              </label>

              <select
                value={cameraMovement}
                onChange={(e) => handleCameraMovementSelect(e.target.value)}
                className="w-full bg-black border border-[#1f2937] p-2 rounded text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
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
              <label className="block text-sm font-medium mb-2">
                Tone
              </label>

              <select
                value={tone}
                onChange={(e) => handleToneSelect(e.target.value)}
                className="w-full bg-black border border-[#1f2937] p-2 rounded text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Resolution
              </label>

              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-black border border-[#1f2937] p-2 rounded text-white"
              >
                <option value="720p">720P</option>
                <option value="1080p">1080P</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Aspect Ratio
              </label>

              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-black border border-[#1f2937] p-2 rounded text-white"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Duration
              </label>

              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value)}
                className="w-full bg-black border border-[#1f2937] p-2 rounded text-white"
              >
                <option value="8s">Quick (8s)</option>
                <option value="30s">Pro (30s)</option>
                <option value="56s">Premium (56s)</option>
              </select>
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Audio</label>

              <button
                onClick={() => setAudio(!audio)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                  audio ? "bg-purple-600" : "bg-[#1f2937]"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full transform transition ${
                    audio ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:opacity-50 text-white font-semibold rounded-xl transition duration-200"
          >
            {loading ? "Generating..." : "Generate Video"}
          </button>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}