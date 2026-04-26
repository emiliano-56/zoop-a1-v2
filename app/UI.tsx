"use client"
import { useState, useRef, useEffect } from "react"
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react"

export default function Page() {
  const [scenes, setScenes] = useState([{ text: "", images: [] as File[] }])
  const [aspect, setAspect] = useState("16:9")
  const [videoUrl, setVideoUrl] = useState("")

  const [voice, setVoice] = useState("female")
  const [bgMusic, setBgMusic] = useState<File | null>(null)
  const [volume, setVolume] = useState(0.3)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [style, setStyle] = useState({
    color: "#ffffff",
    bg: "#00000088",
    align: "center",
    font: "default"
  })

  // 🔥 sync preview volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // =========================
  // SCENE CONTROLS
  // =========================
  const moveScene = (i: number, dir: number) => {
    const copy = [...scenes]
    const newIndex = i + dir
    if (newIndex < 0 || newIndex >= scenes.length) return
    ;[copy[i], copy[newIndex]] = [copy[newIndex], copy[i]]
    setScenes(copy)
  }

  const deleteScene = (i: number) => {
    const copy = scenes.filter((_, idx) => idx !== i)
    setScenes(copy.length ? copy : [{ text: "", images: [] }])
  }

  const moveImage = (sceneIndex: number, i: number, dir: number) => {
    const copy = [...scenes]
    const imgs = copy[sceneIndex].images
    const newIndex = i + dir
    if (newIndex < 0 || newIndex >= imgs.length) return
    ;[imgs[i], imgs[newIndex]] = [imgs[newIndex], imgs[i]]
    setScenes(copy)
  }

  // =========================
  // GENERATE
  // =========================
  const generate = async () => {
    const form = new FormData()

    const meta = scenes.map(s => ({
      text: s.text,
      image_count: s.images.length
    }))

    form.append("scenes", JSON.stringify(meta))
    form.append("aspect_ratio", aspect)
    form.append("style", JSON.stringify(style))
    form.append("voice", voice)
    form.append("bg_volume", String(volume))

    scenes.forEach(s => s.images.forEach(img => form.append("files", img)))

    if (bgMusic) form.append("files", bgMusic)

    const res = await fetch("http://127.0.0.1:8000/generate", {
      method: "POST",
      body: form
    })

    const blob = await res.blob()
    setVideoUrl(URL.createObjectURL(blob))
  }

  return (
    <div className="flex h-screen bg-white">

      {/* LEFT PANEL */}
      <div className="w-[400px] border-r p-4 overflow-y-auto space-y-4">

        {/* CONTROLS */}
        <div className="space-y-3">

          <select value={aspect} onChange={e => setAspect(e.target.value)} className="w-full border p-2">
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>

          <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full border p-2">
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>

          <select value={style.font} onChange={e => setStyle({ ...style, font: e.target.value })} className="w-full border p-2">
            <option value="default">Default</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>

          <div className="flex gap-2">
            <input type="color" value={style.color} onChange={e => setStyle({ ...style, color: e.target.value })} />
            <input type="color" onChange={e => setStyle({ ...style, bg: e.target.value + "88" })} />
          </div>

          <select value={style.align} onChange={e => setStyle({ ...style, align: e.target.value })} className="w-full border p-2">
            <option value="center">Center</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>

          {/* 🎵 BG MUSIC */}
          <div className="space-y-2">
            <input
              type="file"
              accept="audio/*"
              onChange={e => setBgMusic(e.target.files?.[0] || null)}
            />

            {bgMusic && (
              <div className="space-y-2">
                <audio
                  ref={audioRef}
                  controls
                  src={URL.createObjectURL(bgMusic)}
                  className="w-full"
                />

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                />

                <button
                  onClick={() => setBgMusic(null)}
                  className="w-full border py-1 text-sm"
                >
                  Remove Music
                </button>
              </div>
            )}
          </div>

        </div>

        {/* SCENES */}
        {scenes.map((scene, i) => (
          <div key={i} className="border p-3">

            <div className="flex justify-between mb-2">
              <span>Scene {i + 1}</span>
              <div className="flex gap-2">
                <ArrowUp onClick={() => moveScene(i, -1)} className="cursor-pointer" />
                <ArrowDown onClick={() => moveScene(i, 1)} className="cursor-pointer" />
                <Trash2 onClick={() => deleteScene(i)} className="cursor-pointer text-red-500" />
              </div>
            </div>

            <textarea
              value={scene.text}
              onChange={e => {
                const copy = [...scenes]
                copy[i].text = e.target.value
                setScenes(copy)
              }}
              className="w-full border p-2 mb-2"
            />

            {/* 🔥 FIXED IMAGE UPLOAD (APPEND) */}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                const copy = [...scenes]
                const newFiles = Array.from(e.target.files || [])
                copy[i].images = [...copy[i].images, ...newFiles]
                setScenes(copy)
              }}
            />

            {/* PREVIEW */}
            <div className="flex flex-wrap gap-2 mt-2">
              {scene.images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={URL.createObjectURL(img)} className="w-16 h-16 object-cover" />

                  <div className="absolute top-0 right-0 flex gap-1">
                    <ArrowUp size={14} onClick={() => moveImage(i, idx, -1)} className="cursor-pointer bg-white" />
                    <ArrowDown size={14} onClick={() => moveImage(i, idx, 1)} className="cursor-pointer bg-white" />
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}

        <button onClick={() => setScenes([...scenes, { text: "", images: [] }])} className="w-full border py-2">
          Add Scene
        </button>

        <button onClick={generate} className="w-full bg-black text-white py-2">
          Generate
        </button>

      </div>

      {/* PREVIEW */}
      <div className="flex-1 flex items-center justify-center">
        {videoUrl ? (
          <video src={videoUrl} controls className="max-h-[90%]" />
        ) : (
          <p className="text-gray-400">Preview</p>
        )}
      </div>
    </div>
  )
}
