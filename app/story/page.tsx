"use client"
import { useState, useEffect, useRef } from "react"
import { ArrowUp, ArrowDown, Eye, X, Play, Trash2 } from "lucide-react"
import WaveSurfer from "wavesurfer.js"

export default function Page() {
  const [scenes, setScenes] = useState([{ text: "", imageUrls: [] as string[] }])
  const [aspect, setAspect] = useState("16:9")
  const [videoUrl, setVideoUrl] = useState("")
  const [videoTitle, setVideoTitle] = useState("")
  const [loading, setLoading] = useState(false)

  const [voice, setVoice] = useState("en-US-AriaNeural")
   const [font, setFont] = useState("poppins-regular")
  const [fontSize, setFontSize] = useState("medium")

  const [bgMusic, setBgMusic] = useState<File | null>(null)
  const [bgMusicUrl, setBgMusicUrl] = useState("")
  const [bgVolume, setBgVolume] = useState(20)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState<string>("")

  const [audioModalOpen, setAudioModalOpen] = useState(false)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 🔥 NEW: Speech speed state
  const [speechRate, setSpeechRate] = useState("+0%")

  const [style, setStyle] = useState({
   color: "#ffffff",
    bg: "#00000088",
    align: "center",
    font: "poppins-regular",
    font_size: "medium",
    effect: "zoom"

  })

   // ✅ Sync font → style
  useEffect(() => {
    setStyle(prev => ({
      ...prev,
      font: font
    }))
  }, [font])
  // 🔥 CLEANUP OLD AUDIO URL (important)
  useEffect(() => {
    return () => {
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview)
      }
    }
  }, [audioPreview])

  // 🔥 CLEANUP WAVESURFER ON MODAL CLOSE
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
        wavesurferRef.current = null
      }
    }
  }, [])

  // 🔥 APPLY VOLUME TO WAVESURFER
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(bgVolume / 100)
    }
  }, [bgVolume, audioModalOpen])

  const moveScene = (i: number, dir: number) => {
    const copy = [...scenes]
    const newIndex = i + dir
    if (newIndex < 0 || newIndex >= scenes.length) return
    ;[copy[i], copy[newIndex]] = [copy[newIndex], copy[i]]
    setScenes(copy)
  }

  const deleteScene = (i: number) => {
    const copy = scenes.filter((_, idx) => idx !== i)
    setScenes(copy.length === 0 ? [{ text: "", imageUrls: [] }] : copy)
  }

  const moveImageUrl = (sceneIndex: number, i: number, dir: number) => {
    const copy = [...scenes]
    const urls = copy[sceneIndex].imageUrls
    const newIndex = i + dir
    if (newIndex < 0 || newIndex >= urls.length) return
    ;[urls[i], urls[newIndex]] = [urls[newIndex], urls[i]]
    setScenes(copy)
  }

  const getFirstTwoWords = (text: string) => {
    const words = text.trim().split(" ")
    return words.slice(0, 2).join(" ")
  }

  const getAlignClass = (align: string) => {
    switch(align) {
      case "left":
        return "text-left"
      case "right":
        return "text-right"
      default:
        return "text-center"
    }
  }

// ✅ SIMPLIFIED (Poppins only)
  const getFontFamily = () => {
    return "'Poppins', sans-serif"
  }
  

  // ✅ MATCH BACKEND (only 3 sizes)
  const getFontSizePixels = (sizeKey: string) => {
    const fontSizes: { [key: string]: number } = {
      small: 40,
      medium: 60,
      large: 80
    }
    return fontSizes[sizeKey] || 60
  }
  const getAspectRatioPadding = (ratio: string) => {
    if (ratio === "9:16") {
      return "pt-[177.78%]"
    }
    return "pt-[56.25%]"
  }

  const openScenePreview = (imageUrl: string, sceneText: string) => {
    setSelectedImage(imageUrl)
    setSelectedText(sceneText)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedImage(null)
    setSelectedText("")
  }

  const openAudioModal = async () => {
    setAudioModalOpen(true)
    
    // Initialize wavesurfer after modal opens
    setTimeout(() => {
      if (containerRef.current && (audioPreview || bgMusicUrl)) {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy()
        }

        const audioSource = audioPreview || bgMusicUrl

        wavesurferRef.current = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "#3b82f6",
          progressColor: "#1e40af",
          cursorColor: "#000000",
          barWidth: 2,
          barGap: 1,
          height: 80,
          url: audioSource
        })

        // Apply volume after creation
        wavesurferRef.current.on('ready', () => {
          if (wavesurferRef.current) {
            wavesurferRef.current.setVolume(bgVolume / 100)
          }
        })
      }
    }, 100)
  }

  const closeAudioModal = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy()
      wavesurferRef.current = null
    }
    setAudioModalOpen(false)
  }

  const downloadVideo = () => {
    if (!videoUrl) return

    const fileName = videoTitle.trim() || "zoop-video"
    const a = document.createElement("a")
    a.href = videoUrl
    a.download = `${fileName}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const generate = async () => {
    setLoading(true)

    const form = new FormData()

    const meta = scenes.map(s => ({
      text: s.text,
      image_urls: s.imageUrls
    }))

    form.append("scenes", JSON.stringify(meta))
    form.append("aspect_ratio", aspect)

    form.append("style", JSON.stringify({
      ...style,
      font,
      font_size: fontSize
    }))

    form.append("voice", voice)

    // ✅ Convert volume from 0-100 to 0-1
    form.append("bg_volume", (bgVolume / 100).toString())

    if (bgMusic) {
      form.append("bg_music", bgMusic)
    }

    if (bgMusicUrl) {
      form.append("bg_music_url", bgMusicUrl)
    }

    // 🔥 Add speech speed to backend
    form.append("speech_rate", speechRate)

    try {
      const res = await fetch("https://zoop-a1-v2.onrender.com/generate", {
        method: "POST",
        body: form
      })

      const blob = await res.blob()
      setVideoUrl(URL.createObjectURL(blob))
    } catch (err) {
      alert("Error generating video")
    }

    setLoading(false)
  }

  return (
    <div className="flex h-screen bg-white">

      {/* LEFT PANEL */}
      <div className="w-[400px] border-r p-4 overflow-y-auto">

        {/* Controls */}
        <div className="mb-4 space-y-3">

          {/* Video Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">Video Title</label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              className="w-full border p-2"
              placeholder="Enter video title"
            />
          </div>

          <select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full border p-2">
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>

          {/* Voice */}
          <select value={voice} onChange={e=>setVoice(e.target.value)} className="w-full border p-2">
            <optgroup label="English">
              <option value="en-US-AriaNeural">Aria (US Female)</option>
              <option value="en-US-GuyNeural">Guy (US Male)</option>
              <option value="en-GB-SoniaNeural">Sonia (UK)</option>
            </optgroup>
            <optgroup label="French">
              <option value="fr-FR-DeniseNeural">Denise</option>
              <option value="fr-FR-HenriNeural">Henri</option>
            </optgroup>
            <optgroup label="German">
              <option value="de-DE-KatjaNeural">Katja</option>
              <option value="de-DE-ConradNeural">Conrad</option>
            </optgroup>
            <optgroup label="Spanish">
              <option value="es-ES-ElviraNeural">Elvira</option>
              <option value="es-ES-AlvaroNeural">Alvaro</option>
            </optgroup>
            <optgroup label="Asian">
              <option value="zh-CN-XiaoxiaoNeural">Chinese Female</option>
              <option value="ja-JP-NanamiNeural">Japanese Female</option>
              <option value="ko-KR-SunHiNeural">Korean Female</option>
            </optgroup>
          </select>

         {/* Font */}
<select
  value={font}
  onChange={e => setFont(e.target.value)}
  className="w-full border p-2"
>
  <option value="poppins-regular">Poppins (Default)</option>
  <option value="poppins-bold">Poppins Bold</option>
</select>

        {/* Font Size */}
<select
  value={fontSize}
  onChange={e => setFontSize(e.target.value)}
  className="w-full border p-2"
>
  <option value="small">Small</option>
  <option value="medium">Medium</option>
  <option value="large">Large</option>
</select>
{/* Animation Effect */}
<select
  value={style.effect}
  onChange={e =>
    setStyle(prev => ({
      ...prev,
      effect: e.target.value
    }))
  }
  className="w-full border p-2"
>
  <option value="none">No Animation</option> {/* 🔥 NEW */}
  <option value="zoom">Zoom (Recommended)</option>
  <option value="fade">Fade</option>
  <option value="slide_left">Slide Left</option>
  <option value="slide_right">Slide Right</option>
</select>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-semibold mb-2">Text Color</label>
            <input type="color" value={style.color} onChange={e=>setStyle({...style,color:e.target.value})} className="w-full h-10 cursor-pointer"/>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-semibold mb-2">Background Color</label>
            <input type="color" value={style.bg.slice(0, 7)} onChange={e=>setStyle({...style,bg:e.target.value+"88"})} className="w-full h-10 cursor-pointer"/>
          </div>

          {/* Text Alignment/Position */}
          <div>
            <label className="block text-sm font-semibold mb-2">Text Position</label>
            <select value={style.align} onChange={e=>setStyle({...style,align:e.target.value})} className="w-full border p-2">
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          {/* BG Music Upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">Background Music</label>
            <input
              type="file"
              accept="audio/*"
              onChange={e=>{
                const file = e.target.files?.[0] || null

                // 🔥 remove old preview
                if (audioPreview) {
                  URL.revokeObjectURL(audioPreview)
                }

                setBgMusic(file)
                setBgMusicUrl("")

                if (file) {
                  const url = URL.createObjectURL(file)
                  setAudioPreview(url)
                } else {
                  setAudioPreview(null)
                }
              }}
            />
          </div>

          {/* BG Music URL */}
          <input
            type="text"
            placeholder="Or paste BGM URL here"
            value={bgMusicUrl}
            onChange={e=>{
              setBgMusicUrl(e.target.value)
              if (e.target.value.trim()) {
                setAudioPreview(null)
                setBgMusic(null)
              }
            }}
            className="w-full border p-2"
          />

          {/* AUDIO PREVIEW BUTTON - Only for direct uploads */}
          {audioPreview && (
            <button
              onClick={openAudioModal}
              className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <Play size={18} />
              Preview Audio
            </button>
          )}

          {/* Volume Input Field (0-100) */}
          <div>
            <label className="block text-sm font-semibold mb-2">Music Volume</label>
            <input
              type="number"
              min="0"
              max="100"
              value={bgVolume}
              onChange={(e)=>{
                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                setBgVolume(val)
              }}
              className="w-full border p-2"
              placeholder="Enter volume 0-100"
            />
            <span className="text-xs text-gray-500">{bgVolume}%</span>
          </div>

          {/* 🔥 Speech Speed Control */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Speech Speed
            </label>

            <select
              value={speechRate}
              onChange={(e)=>setSpeechRate(e.target.value)}
              className="w-full border p-2"
            >
              <option value="-50%">0.5x (Very Slow)</option>
              <option value="-20%">0.8x (Slow)</option>
              <option value="+0%">1.0x (Normal)</option>
              <option value="+30%">1.3x</option>
              <option value="+50%">1.5x</option>
              <option value="+80%">1.8x (Fast)</option>
              <option value="+100%">2.0x (Very Fast)</option>
            </select>
          </div>

        </div>

        {/* Scenes */}
        {scenes.map((scene, i) => (
          <div key={i} className="border p-3 mb-4">

            <div className="flex justify-between mb-2">
              <span>Scene {i+1}</span>
              <div className="flex gap-2">
                <ArrowUp onClick={()=>moveScene(i,-1)} className="cursor-pointer hover:text-blue-600"/>
                <ArrowDown onClick={()=>moveScene(i,1)} className="cursor-pointer hover:text-blue-600"/>
                <Trash2 onClick={()=>deleteScene(i)} className="cursor-pointer hover:text-red-600" size={20}/>
              </div>
            </div>

            <textarea
              value={scene.text}
              onChange={e=>{
                const copy=[...scenes]
                copy[i].text=e.target.value
                setScenes(copy)
              }}
              className="w-full border p-2 mb-2"
              placeholder="Scene subtitle/text"
            />

            {/* Image URL - One per scene */}
            <div className="mt-3">
              <label className="block text-sm font-semibold mb-2">Image URL</label>
              {scene.imageUrls.length === 0 && (
                <button onClick={()=>{
                  const copy=[...scenes]
                  copy[i].imageUrls.push("")
                  setScenes(copy)
                }} className="w-full border py-2 mt-2 text-sm">
                  Add Image URL
                </button>
              )}
              {scene.imageUrls.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={scene.imageUrls[0]}
                    onChange={e=>{
                      const copy=[...scenes]
                      copy[i].imageUrls[0]=e.target.value
                      setScenes(copy)
                    }}
                    className="flex-1 border p-2 text-sm"
                    placeholder="Image URL"
                  />
                  <button onClick={()=>{
                    const copy=[...scenes]
                    copy[i].imageUrls=[]
                    setScenes(copy)
                  }} className="bg-red-500 text-white px-2 py-1 text-sm">
                    Remove
                  </button>
                </div>
              )}

              {/* Preview for Image URLs */}
              <div className="flex flex-wrap gap-2 mt-2">
                {scene.imageUrls.map((url, idx) => url.trim() && (
                  <div key={`url-${idx}`} className="relative">
                    <img src={url} className="w-16 h-16 object-cover" alt="preview" />
                    <button
                      onClick={() => openScenePreview(url, scene.text)}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-50 transition rounded"
                    >
                      <Eye size={20} className="text-white opacity-0 hover:opacity-100" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}

        <button onClick={()=>setScenes([...scenes,{text:"",imageUrls:[]}])} className="w-full border py-2 mb-2">
          Add Scene
        </button>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-black text-white py-2 flex items-center justify-center gap-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* RIGHT PANEL - PREVIEW & DOWNLOAD */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {videoUrl ? (
          <div className="flex flex-col items-center gap-6">
            <video src={videoUrl} controls className="max-h-[70vh] rounded-lg shadow-lg" />
            <button
              onClick={downloadVideo}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Download Video
            </button>
          </div>
        ) : (
          <p className="text-gray-400 text-lg">Generated video will appear here</p>
        )}
      </div>

      {/* MODAL FOR SCENE PREVIEW */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
              <h2 className="text-2xl font-bold">Scene Preview</h2>
              <button onClick={closeModal} className="text-gray-600 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>

            {selectedImage && (
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
                <div className={`relative w-full ${getAspectRatioPadding(aspect)}`}>
                  <img src={selectedImage} className="absolute inset-0 w-full h-full object-cover" alt="scene" />
                  
                  {/* SUBTITLE ON IMAGE - BOTTOM SECTION */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 p-4 rounded-b-lg ${getAlignClass(style.align)}`}
                    style={{
                      backgroundColor: style.bg
                    }}
                  >
                  <p
  style={{
    color: style.color,
    fontFamily: getFontFamily(),
    fontSize: `${getFontSizePixels(fontSize)}px`,
    fontWeight: "bold",
    margin: 0
  }}
>
  {getFirstTwoWords(selectedText) || "No subtitle"}
</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={closeModal}
              className="w-full mt-6 bg-black text-white py-2 rounded-lg hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL FOR AUDIO PREVIEW */}
      {audioModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Audio Preview</h2>
              <button onClick={closeAudioModal} className="text-gray-600 hover:text-gray-900">
                <X size={24} />
              </button>
            </div>

            <div ref={containerRef} className="mb-4" />

            <div className="flex gap-2">
              <button
                onClick={() => wavesurferRef.current?.playPause()}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Play / Pause
              </button>
              <button
                onClick={closeAudioModal}
                className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
