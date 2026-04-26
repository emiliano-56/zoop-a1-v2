"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"

export default function Page() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [error, setError] = useState("")
  const [history, setHistory] = useState([])
  
  const [selectedStyle, setSelectedStyle] = useState("")
  const [selectedQuality, setSelectedQuality] = useState("")
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("16:9")
  const [selectedLighting, setSelectedLighting] = useState("")
  const [selectedMood, setSelectedMood] = useState("")
  const [carouselIndex, setCarouselIndex] = useState(0)

  const styles = [
    { name: "Realistic", image: "https://images.unsplash.com/photo-1611532736579-6b16e2b50449?w=200&h=200&fit=crop" },
    { name: "Anime", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop" },
    { name: "Watercolor", image: "https://images.unsplash.com/photo-1579783902614-e3fb5141b0cb?w=200&h=200&fit=crop" },
    { name: "Oil Painting", image: "https://images.unsplash.com/photo-1549887534-f3e4d1faea7e?w=200&h=200&fit=crop" },
    { name: "Sketch", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop" },
    { name: "Cyberpunk", image: "https://images.unsplash.com/photo-1586253408409-04149c1f3c6f?w=200&h=200&fit=crop" },
    { name: "Fantasy", image: "https://images.unsplash.com/photo-1570706572429-2b8c16ca1a45?w=200&h=200&fit=crop" },
    { name: "Minimalist", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop" },
  ]

  const qualities = ["standard", "quality-high", "quality-ultra"]
  const aspectRatios = ["1:1", "4:3", "16:9", "9:16", "21:9", "3:2", "2:3"]
  const lightingOptions = ["Natural", "Studio", "Dramatic", "Cinematic"]
  const moodOptions = ["Calm", "Energetic", "Dark", "Vibrant"]

  const characterCount = prompt.length

  const handleStyleSelect = (styleName) => {
    const newStyle = selectedStyle === styleName ? "" : styleName
    setSelectedStyle(newStyle)
    updateTextarea(basePromptText, newStyle, selectedQuality, selectedLighting, selectedMood)
  }

  const basePromptText = prompt.split(/style-|quality-|lighting-|mood-/)[0].trim()

  const updateTextarea = (basePrompt, style, quality, lighting, mood) => {
    let newPrompt = basePrompt
    const attributes = []
    if (style) attributes.push(`style-${style}`)
    if (quality) attributes.push(`quality-${quality}`)
    if (lighting) attributes.push(`lighting-${lighting}`)
    if (mood) attributes.push(`mood-${mood}`)
    
    if (attributes.length > 0) {
      newPrompt += ` ${attributes.join(" ")}`
    }
    setPrompt(newPrompt)
  }

  const nextCarouselItem = () => {
    setCarouselIndex((prev) => (prev + 2) % styles.length)
  }

  const prevCarouselItem = () => {
    setCarouselIndex((prev) => (prev - 2 + styles.length) % styles.length)
  }

  // Get display styles (2 at a time for carousel)
  const getDisplayStyles = () => {
    return [
      styles[carouselIndex % styles.length],
      styles[(carouselIndex + 1) % styles.length]
    ]
  }

  const handleGenerate = async () => {
    if (!basePromptText.trim()) return

    setLoading(true)
    setError("")
    setImageUrl("")

    // Use the prompt that already has attributes from textarea
    let enhancedPrompt = prompt

    try {
      const response = await fetch("http://127.0.0.1:8000/nano/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          output_format: "png",
          aspect_ratio: selectedAspectRatio,
        }),
      })

      const data = await response.json()

      if (data.success && data.image_url) {
        setImageUrl(data.image_url)
        // Add to history
        setHistory([data.image_url, ...history.slice(0, 9)])
      } else {
        setError(data.message || "Failed to generate image")
      }
    } catch (err) {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/nano/download-image?image_url=${encodeURIComponent(imageUrl)}`
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "generated-image.png"
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError("Failed to download image")
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold mb-8">Image Generator</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="w-full rounded-lg bg-black border border-purple-500 p-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[150px] resize-none"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {characterCount} characters
                </div>
              </div>

              {/* Choose a Style - Carousel */}
              <div>
                <label className="block text-sm font-medium mb-3">Choose a Style</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={prevCarouselItem}
                    className="rounded-lg bg-purple-600 p-2 hover:bg-purple-700 transition-colors flex-shrink-0"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex gap-2 flex-1">
                    {getDisplayStyles().map((style) => (
                      <button
                        key={style.name}
                        onClick={() => handleStyleSelect(style.name)}
                        className={`relative flex-1 rounded-lg overflow-hidden border-2 transition-all h-32 ${
                          selectedStyle === style.name
                            ? "border-purple-400 ring-2 ring-purple-400"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <img
                          src={style.image}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-sm font-medium text-white text-center px-1">
                          {style.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={nextCarouselItem}
                    className="rounded-lg bg-purple-600 p-2 hover:bg-purple-700 transition-colors flex-shrink-0"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Quality & Aspect Ratio - Two Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quality</label>
                  <select
                    value={selectedQuality}
                    onChange={(e) => {
                      setSelectedQuality(e.target.value)
                      updateTextarea(basePromptText, selectedStyle, e.target.value, selectedLighting, selectedMood)
                    }}
                    className="w-full rounded-lg bg-black border border-purple-500 p-3 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select quality</option>
                    {qualities.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                  <select
                    value={selectedAspectRatio}
                    onChange={(e) => setSelectedAspectRatio(e.target.value)}
                    className="w-full rounded-lg bg-black border border-purple-500 p-3 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {aspectRatios.map((ratio) => (
                      <option key={ratio} value={ratio}>
                        {ratio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lighting & Mood - Two Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lighting</label>
                  <select
                    value={selectedLighting}
                    onChange={(e) => {
                      setSelectedLighting(e.target.value)
                      updateTextarea(basePromptText, selectedStyle, selectedQuality, e.target.value, selectedMood)
                    }}
                    className="w-full rounded-lg bg-black border border-purple-500 p-3 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select lighting</option>
                    {lightingOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mood</label>
                  <select
                    value={selectedMood}
                    onChange={(e) => {
                      setSelectedMood(e.target.value)
                      updateTextarea(basePromptText, selectedStyle, selectedQuality, selectedLighting, e.target.value)
                    }}
                    className="w-full rounded-lg bg-black border border-purple-500 p-3 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select mood</option>
                    {moodOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full rounded-lg bg-purple-600 px-6 py-3 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Generating..." : "Generate Image"}
              </button>
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-2">
            {error && (
              <div className="rounded-lg border border-red-500 bg-red-950 p-4 text-red-200 mb-6">
                {error}
              </div>
            )}

            {imageUrl ? (
              <div className="space-y-6">
                {/* Download Button */}
                <button
                  onClick={downloadImage}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-white font-medium hover:bg-purple-700 transition-colors"
                >
                  <Download size={20} />
                  Download Image
                </button>

                {/* Generated Image - Reduced Size */}
                <div className="rounded-lg overflow-hidden border border-gray-700 bg-black p-4 flex justify-center mt-8">
                  <img
                    src={imageUrl}
                    alt="Generated"
                    className="max-w-md rounded-lg"
                  />
                </div>


              </div>
            ) : (
              <div className="rounded-lg border border-gray-700 bg-black p-12 text-center mt-12">
                <p className="text-gray-400">
                  {loading
                    ? "Generating your image..."
                    : "Your generated image will appear here"}
                </p>
              </div>
            )}

            {/* History - Always visible */}
            <div className="rounded-lg border border-gray-700 bg-black p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">History</h2>
              {history.length > 0 ? (
                <div className="grid grid-cols-5 gap-3">
                  {history.map((imageUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setImageUrl(imageUrl)}
                      className="relative rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
                    >
                      <img
                        src={imageUrl}
                        alt={`History ${idx}`}
                        className="w-full h-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No images yet. Generate one to get started!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
