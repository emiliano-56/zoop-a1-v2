 "use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, Sparkles, X, ArrowLeft, Copy, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import Footer from "@/components/footer"
import ReactMarkdown from "react-markdown"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Page() {
  const router = useRouter()
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

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState("")
  const [aiMessages, setAiMessages] = useState([])
  const [aiShowLoading, setAiShowLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const handleCopyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const styles = [
    { name: "Realistic", image: "https://ibb.co/mVPXmYJx" },
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
      const response = await fetch("https://zoop-a1-v2.onrender.com/nano/generate-image", {
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
        `https://zoop-a1-v2.onrender.com/nano/download-image?image_url=${encodeURIComponent(imageUrl)}`
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

  const handleAiPrompt = async () => {
    if (!aiPrompt.trim()) return

    setAiLoading(true)
    setAiShowLoading(true)
    setAiResponse("")

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 'sk-b6ab7779c93441f8ae28dfbf0a9895d3'}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            ...aiMessages,
            { role: "user", content: `${aiPrompt}\n\nPlease respond in English only.` }
          ],
          stream: false,
        }),
      })

      const data = await response.json()

      if (data.choices && data.choices[0].message) {
        const assistantMessage = data.choices[0].message.content
        setAiShowLoading(false)
        setAiResponse(assistantMessage)
        setAiMessages([
          ...aiMessages,
          { role: "user", content: aiPrompt },
          { role: "assistant", content: assistantMessage }
        ])
        setAiPrompt("")
      } else {
        setAiShowLoading(false)
        setAiResponse("Error: Unable to get response from AI")
      }
    } catch (err) {
      console.error("[v0] AI Prompt error:", err)
      setAiShowLoading(false)
      setAiResponse("Error: Failed to connect to AI service")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Back to Home Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 mb-8 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>

          <h1 className="text-4xl font-bold mb-8">Image Generator</h1>

        {/* AI Modal Overlay */}
        {aiModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setAiModalOpen(false)} />
        )}

        {/* AI Modal */}
        <div
          className={`fixed right-0 top-0 h-screen w-96 bg-black border-l border-white/10 flex flex-col transition-transform duration-300 z-50 ${aiModalOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400" />
              AI Assistant
            </h2>
            <button
              onClick={() => setAiModalOpen(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {aiMessages.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <p>Ask me anything about image generation!</p>
              </div>
            )}
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg ${msg.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-transparent text-white"
                      }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="text-sm leading-relaxed prose prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ ...props }) => <h1 className="text-lg font-bold mt-2 mb-2" {...props} />,
                            h2: ({ ...props }) => <h2 className="text-base font-bold mt-2 mb-2" {...props} />,
                            h3: ({ ...props }) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                            p: ({ ...props }) => <p className="mb-2" {...props} />,
                            ul: ({ ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                            ol: ({ ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                            li: ({ ...props }) => <li className="text-sm" {...props} />,
                            code: ({ ...props }) => <code className="bg-black/50 px-2 py-1 rounded text-xs" {...props} />,
                            pre: ({ ...props }) => <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto mb-2" {...props} />,
                            blockquote: ({ ...props }) => <blockquote className="border-l-4 border-purple-400 pl-4 italic text-gray-300 mb-2" {...props} />,
                            table: ({ ...props }) => <table className="border-collapse border border-gray-500 mb-2 text-xs" {...props} />,
                            th: ({ ...props }) => <th className="border border-gray-500 px-2 py-1 bg-black/50" {...props} />,
                            td: ({ ...props }) => <td className="border border-gray-500 px-2 py-1" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded mt-2"
                      title="Copy message"
                    >
                      {copiedIdx === idx ? (
                        <Check size={16} className="text-green-400" />
                      ) : (
                        <Copy size={16} className="text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {aiShowLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-2 text-white">
                  <p className="text-sm">
                    <span className="inline-block animate-bounce">.</span>
                    <span className="inline-block animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                    <span className="inline-block animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-white/10 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleAiPrompt()
                    }
                  }}
                  placeholder="Ask me something..."
                  className="flex-1 rounded-lg bg-black border border-purple-500 px-4 py-2 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none max-h-24 overflow-y-auto"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {aiPrompt.length} characters
                </div>
              </div>
              <button
                onClick={handleAiPrompt}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium h-fit"
              >
                {aiLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="w-full rounded-lg bg-black border border-purple-500 p-4 pr-12 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[150px] resize-none"
                  />
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
                    title="Open AI Assistant"
                  >
                    <Sparkles size={18} className="text-white" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{characterCount} characters</span>
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
                        className={`relative flex-1 rounded-lg overflow-hidden border-2 transition-all h-32 ${selectedStyle === style.name
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
                  <Select value={selectedQuality} onValueChange={(value) => {
                    setSelectedQuality(value)
                    updateTextarea(basePromptText, selectedStyle, value, selectedLighting, selectedMood)
                  }}>
                    <SelectTrigger className="w-full rounded-lg bg-black border-purple-500 text-white">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent className="bg-purple-100 border-purple-500">
                      {qualities.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                  <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
                    <SelectTrigger className="w-full rounded-lg bg-black border-purple-500 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-purple-100 border-purple-500">
                      {aspectRatios.map((ratio) => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lighting & Mood - Two Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lighting</label>
                  <Select value={selectedLighting} onValueChange={(value) => {
                    setSelectedLighting(value)
                    updateTextarea(basePromptText, selectedStyle, selectedQuality, value, selectedMood)
                  }}>
                    <SelectTrigger className="w-full rounded-lg bg-black border-purple-500 text-white">
                      <SelectValue placeholder="Select lighting" />
                    </SelectTrigger>
                    <SelectContent className="bg-purple-100 border-purple-500">
                      {lightingOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mood</label>
                  <Select value={selectedMood} onValueChange={(value) => {
                    setSelectedMood(value)
                    updateTextarea(basePromptText, selectedStyle, selectedQuality, selectedLighting, value)
                  }}>
                    <SelectTrigger className="w-full rounded-lg bg-black border-purple-500 text-white">
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
                    <SelectContent className="bg-purple-100 border-purple-500">
                      {moodOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      </div>
      <Footer />
    </main>
  )
}
