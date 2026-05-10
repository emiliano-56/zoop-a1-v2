"use client"
import { useState, useEffect, useRef } from "react"
import { ArrowUp, ArrowDown, Eye, X, Play, Trash2, Loader, Volume2, Wand2, Library, Film, Save, Share2, ArrowLeft } from "lucide-react"
import WaveSurfer from "wavesurfer.js"

export default function Page() {
  const [scenes, setScenes] = useState([{ text: "", imageUrls: [] as string[] }])
  const [aspect, setAspect] = useState("16:9")
  const [videoUrl, setVideoUrl] = useState("")
  const [videoTitle, setVideoTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState("")

  const [voice, setVoice] = useState("en-US-AriaNeural")

  //  Voice sample text per language
const VOICE_SAMPLES: { [key: string]: string } = {
  // ================= ENGLISH - US =================
  "en-US-AriaNeural": "Hello, I am Aria from the United States.",
  "en-US-GuyNeural": "Hello, I am Guy from the United States.",
  "en-US-JennyNeural": "Hello, I am Jenny from the United States.",
  "en-US-DavisNeural": "Hello, I am Davis from the United States.",
  "en-US-AmberNeural": "Hello, I am Amber from the United States.",
  "en-US-BrandonNeural": "Hello, I am Brandon from the United States.",

  // ================= ENGLISH - UK =================
  "en-GB-SoniaNeural": "Hello, I am Sonia from the United Kingdom.",
  "en-GB-RyanNeural": "Hello, I am Ryan from the United Kingdom.",

  // ================= ENGLISH - AUSTRALIA =================
  "en-AU-NatashaNeural": "G'day, I am Natasha from Australia.",
  "en-AU-WilliamNeural": "G'day, I am William from Australia.",

  // ================= ENGLISH - CANADA =================
  "en-CA-ClaraNeural": "Hello, I am Clara from Canada.",
  "en-CA-LiamNeural": "Hello, I am Liam from Canada.",

  // ================= ENGLISH - INDIA =================
  "en-IN-NeerjaNeural": "Hello, I am Neerja from India.",
  "en-IN-PrabhatNeural": "Hello, I am Prabhat from India.",

  // ================= ENGLISH - AFRICA =================
  "en-NG-EzinneNeural": "Hello, I am Ezinne from Nigeria.",
  "en-NG-AbeoNeural": "Hello, I am Abeo from Nigeria.",

  "en-ZA-LeahNeural": "Hello, I am Leah from South Africa.",
  "en-ZA-LukeNeural": "Hello, I am Luke from South Africa.",

  "en-KE-AsiliaNeural": "Hello, I am Asilia from Kenya.",
  "en-KE-ChilembaNeural": "Hello, I am Chilemba from Kenya.",

  // ================= FRENCH =================
  "fr-FR-DeniseNeural": "Bonjour, je suis Denise de France.",
  "fr-FR-HenriNeural": "Bonjour, je suis Henri de France.",

  // ================= GERMAN =================
  "de-DE-KatjaNeural": "Hallo, ich bin Katja aus Deutschland.",
  "de-DE-ConradNeural": "Hallo, ich bin Conrad aus Deutschland.",

  // ================= SPANISH =================
  "es-ES-ElviraNeural": "Hola, soy Elvira de España.",
  "es-ES-AlvaroNeural": "Hola, soy Álvaro de España.",

  "es-MX-DaliaNeural": "Hola, soy Dalia de México.",
  "es-MX-JorgeNeural": "Hola, soy Jorge de México.",

  // ================= PORTUGUESE =================
  "pt-BR-FranciscaNeural": "Olá, eu sou Francisca do Brasil.",
  "pt-BR-AntonioNeural": "Olá, eu sou Antonio do Brasil.",

  "pt-PT-RaquelNeural": "Olá, eu sou Raquel de Portugal.",
  "pt-PT-DuarteNeural": "Olá, eu sou Duarte de Portugal.",

  // ================= INDIAN LANGUAGES =================
  "hi-IN-SwaraNeural": "नमस्ते, मैं स्वरा भारत से हूँ।",
  "hi-IN-MadhurNeural": "नमस्ते, मैं मधुर भारत से हूँ।",

  "ta-IN-PallaviNeural": "வணக்கம், நான் இந்தியாவிலிருந்து பல்லவி.",
  "ta-IN-ValluvarNeural": "வணக்கம், நான் இந்தியாவிலிருந்து வள்ளுவர்.",

  "te-IN-ShrutiNeural": "హలో, నేను భారతదేశానికి చెందిన శ్రుతిని.",
  "te-IN-MohanNeural": "హలో, నేను భారతదేశానికి చెందిన మోహన్‌ని.",

  "bn-IN-TanishaaNeural": "হ্যালো, আমি ভারত থেকে তানিশা।",
  "bn-IN-BashkarNeural": "হ্যালো, আমি ভারত থেকে বাশকার।",

  "ml-IN-SobhanaNeural": "ഹലോ, ഞാൻ ഇന്ത്യയിൽ നിന്നുള്ള ശോഭനയാണ്.",
  "ml-IN-MidhunNeural": "ഹലോ, ഞാൻ ഇന്ത്യയിൽ നിന്നുള്ള മിഥുൻ ആണ്.",

  // ================= CHINESE =================
  "zh-CN-XiaoxiaoNeural": "你好，我是来自中国的晓晓。",
  "zh-CN-YunxiNeural": "你好，我是来自中国的云希。",

  "zh-HK-HiuGaaiNeural": "你好，我係來自香港嘅曉佳。",
  "zh-HK-WanLungNeural": "你好，我係來自香港嘅雲龍。",

  "zh-TW-HsiaoChenNeural": "你好，我是來自台灣的小陳。",
  "zh-TW-YunJheNeural": "你好，我是來自台灣的雲哲。",

  // ================= JAPANESE =================
  "ja-JP-NanamiNeural": "こんにちは、私は日本の七海です。",
  "ja-JP-KeitaNeural": "こんにちは、私は日本の圭太です。",

  // ================= KOREAN =================
  "ko-KR-SunHiNeural": "안녕하세요, 저는 한국의 선희입니다.",
  "ko-KR-InJoonNeural": "안녕하세요, 저는 한국의 인준입니다.",

  // ================= VIETNAMESE =================
  "vi-VN-HoaiMyNeural": "Xin chào, tôi là Hoài My đến từ Việt Nam.",
  "vi-VN-NamMinhNeural": "Xin chào, tôi là Nam Minh đến từ Việt Nam.",

  // ================= THAI =================
  "th-TH-PremwadeeNeural": "สวัสดี ฉันคือ Premwadee จากประเทศไทย",
  "th-TH-NiwatNeural": "สวัสดี ผมคือ Niwat จากประเทศไทย",

  // ================= INDONESIAN =================
  "id-ID-GadisNeural": "Halo, saya Gadis dari Indonesia.",
  "id-ID-ArdiNeural": "Halo, saya Ardi dari Indonesia.",

  // ================= FILIPINO =================
  "fil-PH-BlessicaNeural": "Kamusta, ako si Blessica mula sa Pilipinas.",
  "fil-PH-AngeloNeural": "Kamusta, ako si Angelo mula sa Pilipinas.",

  // ================= ARABIC =================
  "ar-SA-ZariyahNeural": "مرحبًا، أنا زارية من السعودية.",
  "ar-SA-HamedNeural": "مرحبًا، أنا حامد من السعودية.",

  "ar-EG-SalmaNeural": "مرحبًا، أنا سلمى من مصر.",
  "ar-EG-ShakirNeural": "مرحبًا، أنا شاكر من مصر.",

  "ar-AE-FatimaNeural": "مرحبًا، أنا فاطمة من الإمارات.",
  "ar-AE-HamdanNeural": "مرحبًا، أنا حمدان من الإمارات.",

  // ================= AFRICAN LANGUAGES =================
  "af-ZA-AdriNeural": "Hallo, ek is Adri van Suid-Afrika.",
  "af-ZA-WillemNeural": "Hallo, ek is Willem van Suid-Afrika.",

  "sw-TZ-RehemaNeural": "Habari, mimi ni Rehema kutoka Tanzania.",
  "sw-TZ-DaudiNeural": "Habari, mimi ni Daudi kutoka Tanzania.",

  "am-ET-MekdesNeural": "ሰላም፣ እኔ መቅደስ ከኢትዮጵያ ነኝ።",
  "am-ET-AmehaNeural": "ሰላም፣ እኔ አመሃ ከኢትዮጵያ ነኝ።",

  // ================= EUROPEAN =================
  "pl-PL-ZofiaNeural": "Cześć, jestem Zofia z Polski.",
  "pl-PL-MarekNeural": "Cześć, jestem Marek z Polski.",

  "ru-RU-SvetlanaNeural": "Здравствуйте, я Светлана из России.",
  "ru-RU-DmitryNeural": "Здравствуйте, я Дмитрий из России.",

  "uk-UA-PolinaNeural": "Привіт, я Поліна з України.",
  "uk-UA-OstapNeural": "Привіт, я Остап з України.",

  "tr-TR-EmelNeural": "Merhaba, ben Türkiye'den Emel.",
  "tr-TR-AhmetNeural": "Merhaba, ben Türkiye'den Ahmet.",

  "nl-NL-ColetteNeural": "Hallo, ik ben Colette uit Nederland.",
  "nl-NL-MaartenNeural": "Hallo, ik ben Maarten uit Nederland."
}
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
  const [voicePreviewOpen, setVoicePreviewOpen] = useState(false)
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [previewType, setPreviewType] = useState<"voice" | "bgm" | null>(null)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [currentSubtextIndex, setCurrentSubtextIndex] = useState(0)
  const voiceAudioRef = useRef<HTMLAudioElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Animated subtext words
  const subtextWords = ["engaging", "cinematic", "compelling", "immersive", "captivating"]

  // Update subtext word every 3.5 seconds for slow motion effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtextIndex((prev) => (prev + 1) % subtextWords.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [subtextWords.length])

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

  // 🔥 Auto preview when voice changes
  useEffect(() => {
    generateVoicePreview()
  }, [voice])

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

  const openAudioModal = async (type: "voice" | "bgm") => {
    setPreviewType(type)
    setAudioModalOpen(true)
    
    // Initialize wavesurfer after modal opens
    setTimeout(() => {
      if (containerRef.current && (audioPreview || bgMusicUrl)) {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy()
        }

        const audioSource = type === "voice" ? audioPreview : (bgMusicUrl || audioPreview)

        wavesurferRef.current = WaveSurfer.create({
          container: containerRef.current,
          waveColor: type === "voice" ? "#a855f7" : "#3b82f6",
          progressColor: type === "voice" ? "#7c3aed" : "#1e40af",
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
    setAudioReady(false)
    setPreviewType(null)
  }

  const closeVoicePreviewModal = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause()
      voiceAudioRef.current.currentTime = 0
      setIsVoicePlaying(false)
    }
    setVoicePreviewOpen(false)
  }

  const toggleVoicePlayPause = () => {
    if (voiceAudioRef.current) {
      if (isVoicePlaying) {
        voiceAudioRef.current.pause()
        setIsVoicePlaying(false)
      } else {
        voiceAudioRef.current.play()
        setIsVoicePlaying(true)
      }
    }
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
    setStatusText("")

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
    form.append("bg_volume", (bgVolume / 100).toString())
    form.append("speech_rate", speechRate)

    if (bgMusic) form.append("bg_music", bgMusic)
    if (bgMusicUrl) form.append("bg_music_url", bgMusicUrl)

    try {
      // 🔥 STEP 1: Start job
      const res = await fetch(" http://127.0.0.1:8000/story/generate", {
        method: "POST",
        body: form
      })

      const data = await res.json()

      if (!data.job_id) {
        throw new Error("No job id returned")
      }

      const jobId = data.job_id
      setStatusText("queued")

      // 🔥 STEP 2: Poll status
      const poll = async () => {
        const statusRes = await fetch(` http://127.0.0.1:8000/story/status/${jobId}`)
        const statusData = await statusRes.json()

        setStatusText(statusData.status)

        if (statusData.status === "completed") {
          // 🔥 STEP 3: Get video
          const videoRes = await fetch(` http://127.0.0.1:8000/story/download/${jobId}`)
          const blob = await videoRes.blob()

          setVideoUrl(URL.createObjectURL(blob))
          setLoading(false)
          setStatusText("completed")
          return
        }

        if (statusData.status === "failed") {
          alert("Video generation failed: " + statusData.error)
          setLoading(false)
          setStatusText("failed")
          return
        }

        // keep polling every 2 seconds
        setTimeout(poll, 2000)
      }

      poll()

    } catch (err) {
      console.error(err)
      alert("Error generating video")
      setLoading(false)
      setStatusText("")
    }
  }

  // 🔥 Generate voice preview
  const generateVoicePreview = async () => {
    try {
      setVoicePreviewLoading(true)
      const form = new FormData()

      form.append("voice", voice)
      form.append("speech_rate", speechRate)

      // ✅ get correct language text
      const sampleText =
        VOICE_SAMPLES[voice] ||
        "Hello, this is a sample voice preview."

      form.append("text", sampleText)

      const res = await fetch("http://127.0.0.1:8000/story/preview-voice", {
        method: "POST",
        body: form
      })
     

      const blob = await res.blob()

      // 🔥 cleanup old preview
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview)
      }

      const url = URL.createObjectURL(blob)
      setAudioPreview(url)

      // 🔥 open voice preview modal
      setTimeout(() => {
        setVoicePreviewOpen(true)
        setVoicePreviewLoading(false)
      }, 200)

    } catch (err) {
      console.error("Preview error:", err)
      setVoicePreviewLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-black">

      {/* HEADER */}
      <div className="border-b border-gray-700 bg-black px-8 py-6 flex items-center justify-between">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 animate-fadeInDown">Story Creator</h1>
          <p className="text-gray-400 text-lg animate-fadeInUp">
            Transform your ideas into <span className="text-purple-500 font-semibold transition-all duration-700 inline-block">{subtextWords[currentSubtextIndex]}</span> videos
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/home'}
          className="ml-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm whitespace-nowrap animate-slideInRight flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

      {/* LEFT PANEL - Video Title, Aspect, Voice, Scenes, Image URL, Add Scene, Generate */}
      <div className="w-[400px] border-r p-4 overflow-y-auto bg-black animate-slideInLeft">

        <h3 className="text-lg font-bold text-white mb-4">Story Setup</h3>

        {/* Controls */}
        <div className="mb-4 space-y-3">

          {/* Video Title and Aspect Ratio in Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Video Title</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Enter title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Aspect Ratio</label>
              <select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
              </select>
            </div>
          </div>

          {/* Voice - Full Width */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Voice</label>
            <select value={voice} onChange={e=>setVoice(e.target.value)} className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
           <optgroup label="English - US">
  <option value="en-US-AriaNeural">Aria (US Female)</option>
  <option value="en-US-GuyNeural">Guy (US Male)</option>
  <option value="en-US-JennyNeural">Jenny (US Female)</option>
  <option value="en-US-DavisNeural">Davis (US Male)</option>
  <option value="en-US-AmberNeural">Amber (US Female)</option>
  <option value="en-US-BrandonNeural">Brandon (US Male)</option>
</optgroup>

<optgroup label="English - UK">
  <option value="en-GB-SoniaNeural">Sonia (UK Female)</option>
  <option value="en-GB-RyanNeural">Ryan (UK Male)</option>
</optgroup>

<optgroup label="English - Australia">
  <option value="en-AU-NatashaNeural">Natasha (AU Female)</option>
  <option value="en-AU-WilliamNeural">William (AU Male)</option>
</optgroup>

<optgroup label="English - Canada">
  <option value="en-CA-ClaraNeural">Clara (CA Female)</option>
  <option value="en-CA-LiamNeural">Liam (CA Male)</option>
</optgroup>

<optgroup label="English - India">
  <option value="en-IN-NeerjaNeural">Neerja (India Female)</option>
  <option value="en-IN-PrabhatNeural">Prabhat (India Male)</option>
</optgroup>

<optgroup label="English - Africa">
  <option value="en-NG-EzinneNeural">Ezinne (Nigeria Female)</option>
  <option value="en-NG-AbeoNeural">Abeo (Nigeria Male)</option>
  <option value="en-ZA-LeahNeural">Leah (South Africa Female)</option>
  <option value="en-ZA-LukeNeural">Luke (South Africa Male)</option>
  <option value="en-KE-AsiliaNeural">Asilia (Kenya Female)</option>
  <option value="en-KE-ChilembaNeural">Chilemba (Kenya Male)</option>
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
  <option value="es-ES-ElviraNeural">Elvira (Spain Female)</option>
  <option value="es-ES-AlvaroNeural">Alvaro (Spain Male)</option>
  <option value="es-MX-DaliaNeural">Dalia (Mexico Female)</option>
  <option value="es-MX-JorgeNeural">Jorge (Mexico Male)</option>
</optgroup>

<optgroup label="Portuguese">
  <option value="pt-BR-FranciscaNeural">Francisca (Brazil Female)</option>
  <option value="pt-BR-AntonioNeural">Antonio (Brazil Male)</option>
  <option value="pt-PT-RaquelNeural">Raquel (Portugal Female)</option>
  <option value="pt-PT-DuarteNeural">Duarte (Portugal Male)</option>
</optgroup>

<optgroup label="Indian Languages">
  <option value="hi-IN-SwaraNeural">Swara (Hindi Female)</option>
  <option value="hi-IN-MadhurNeural">Madhur (Hindi Male)</option>

  <option value="ta-IN-PallaviNeural">Pallavi (Tamil Female)</option>
  <option value="ta-IN-ValluvarNeural">Valluvar (Tamil Male)</option>

  <option value="te-IN-ShrutiNeural">Shruti (Telugu Female)</option>
  <option value="te-IN-MohanNeural">Mohan (Telugu Male)</option>

  <option value="bn-IN-TanishaaNeural">Tanishaa (Bengali Female)</option>
  <option value="bn-IN-BashkarNeural">Bashkar (Bengali Male)</option>

  <option value="ml-IN-SobhanaNeural">Sobhana (Malayalam Female)</option>
  <option value="ml-IN-MidhunNeural">Midhun (Malayalam Male)</option>
</optgroup>

<optgroup label="Chinese">
  <option value="zh-CN-XiaoxiaoNeural">Xiaoxiao (China Female)</option>
  <option value="zh-CN-YunxiNeural">Yunxi (China Male)</option>
  <option value="zh-HK-HiuGaaiNeural">HiuGaai (Hong Kong Female)</option>
  <option value="zh-HK-WanLungNeural">WanLung (Hong Kong Male)</option>
  <option value="zh-TW-HsiaoChenNeural">HsiaoChen (Taiwan Female)</option>
  <option value="zh-TW-YunJheNeural">YunJhe (Taiwan Male)</option>
</optgroup>

<optgroup label="Japanese">
  <option value="ja-JP-NanamiNeural">Nanami (Japan Female)</option>
  <option value="ja-JP-KeitaNeural">Keita (Japan Male)</option>
</optgroup>

<optgroup label="Korean">
  <option value="ko-KR-SunHiNeural">SunHi (Korea Female)</option>
  <option value="ko-KR-InJoonNeural">InJoon (Korea Male)</option>
</optgroup>

<optgroup label="Vietnamese">
  <option value="vi-VN-HoaiMyNeural">HoaiMy (Vietnam Female)</option>
  <option value="vi-VN-NamMinhNeural">NamMinh (Vietnam Male)</option>
</optgroup>

<optgroup label="Thai">
  <option value="th-TH-PremwadeeNeural">Premwadee (Thailand Female)</option>
  <option value="th-TH-NiwatNeural">Niwat (Thailand Male)</option>
</optgroup>

<optgroup label="Indonesian">
  <option value="id-ID-GadisNeural">Gadis (Indonesia Female)</option>
  <option value="id-ID-ArdiNeural">Ardi (Indonesia Male)</option>
</optgroup>

<optgroup label="Filipino">
  <option value="fil-PH-BlessicaNeural">Blessica (Philippines Female)</option>
  <option value="fil-PH-AngeloNeural">Angelo (Philippines Male)</option>
</optgroup>

<optgroup label="Arabic">
  <option value="ar-SA-ZariyahNeural">Zariyah (Saudi Female)</option>
  <option value="ar-SA-HamedNeural">Hamed (Saudi Male)</option>

  <option value="ar-EG-SalmaNeural">Salma (Egypt Female)</option>
  <option value="ar-EG-ShakirNeural">Shakir (Egypt Male)</option>

  <option value="ar-AE-FatimaNeural">Fatima (UAE Female)</option>
  <option value="ar-AE-HamdanNeural">Hamdan (UAE Male)</option>
</optgroup>

<optgroup label="African Languages">
  <option value="af-ZA-AdriNeural">Adri (Afrikaans Female)</option>
  <option value="af-ZA-WillemNeural">Willem (Afrikaans Male)</option>

  <option value="sw-TZ-RehemaNeural">Rehema (Swahili Female)</option>
  <option value="sw-TZ-DaudiNeural">Daudi (Swahili Male)</option>

  <option value="am-ET-MekdesNeural">Mekdes (Amharic Female)</option>
  <option value="am-ET-AmehaNeural">Ameha (Amharic Male)</option>
</optgroup>

<optgroup label="European">
  <option value="pl-PL-ZofiaNeural">Zofia (Polish Female)</option>
  <option value="pl-PL-MarekNeural">Marek (Polish Male)</option>

  <option value="ru-RU-SvetlanaNeural">Svetlana (Russian Female)</option>
  <option value="ru-RU-DmitryNeural">Dmitry (Russian Male)</option>

  <option value="uk-UA-PolinaNeural">Polina (Ukrainian Female)</option>
  <option value="uk-UA-OstapNeural">Ostap (Ukrainian Male)</option>

  <option value="tr-TR-EmelNeural">Emel (Turkish Female)</option>
  <option value="tr-TR-AhmetNeural">Ahmet (Turkish Male)</option>

  <option value="nl-NL-ColetteNeural">Colette (Dutch Female)</option>
  <option value="nl-NL-MaartenNeural">Maarten (Dutch Male)</option>
</optgroup>
          </select>
            </div>

          <button
            onClick={generateVoicePreview}
            disabled={voicePreviewLoading}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {voicePreviewLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Volume2 size={18} />
                Preview Voice
              </>
            )}
          </button>

        </div>

        {/* Scenes */}
        <div className="space-y-4">
        {scenes.map((scene, i) => (
          <div key={i} className="bg-black p-4 rounded-lg">

            <div className="flex justify-between mb-3">
              <span className="text-white text-sm font-semibold">Scene {i+1}</span>
              <div className="flex gap-2">
                <ArrowUp onClick={()=>moveScene(i,-1)} className="cursor-pointer text-gray-500 hover:text-purple-500 transition"/>
                <ArrowDown onClick={()=>moveScene(i,1)} className="cursor-pointer text-gray-500 hover:text-purple-500 transition"/>
                <Trash2 onClick={()=>deleteScene(i)} className="cursor-pointer text-gray-500 hover:text-red-500 transition" size={20}/>
              </div>
            </div>

            <div className="relative mb-2">
              <div className="flex gap-2 mb-2">
                <Wand2 size={16} className="text-purple-400" />
                <Library size={16} className="text-purple-400" />
                <Save size={16} className="text-purple-400" />
                <Share2 size={16} className="text-purple-400" />
              </div>
            <textarea
              value={scene.text}
              onChange={e=>{
                const copy=[...scenes]
                copy[i].text=e.target.value
                setScenes(copy)
              }}
              className="w-full border border-black bg-black text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
              placeholder="Create your unique story"
              rows={4}
            />
              <div className="text-xs text-gray-500 mt-1 text-right">{scene.text.length} characters</div>
            </div>

            {/* Image URL - One per scene */}
            <div className="mt-3">
              <label className="block text-sm font-semibold mb-2 text-white">Image URL</label>
              {scene.imageUrls.length === 0 && (
                <button onClick={()=>{
                  const copy=[...scenes]
                  copy[i].imageUrls.push("")
                  setScenes(copy)
                }} className="w-full border border-black bg-black text-white py-2 mt-2 text-sm rounded-lg">
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
                    className="flex-1 border border-black bg-black text-white p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="Image URL"
                  />
                  <button onClick={()=>{
                    const copy=[...scenes]
                    copy[i].imageUrls=[]
                    setScenes(copy)
                  }} className="bg-red-600 text-white px-2 py-1 text-sm rounded hover:bg-red-700 transition">
                    Remove
                  </button>
                </div>
              )}

              {/* Preview for Image URLs */}
              <div className="flex flex-wrap gap-2 mt-2">
                {scene.imageUrls.map((url, idx) => url.trim() && (
                  <div key={`url-${idx}`} className="relative">
                    <img src={url} className="w-16 h-16 object-cover rounded" alt="preview" />
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
        </div>

        <button onClick={()=>setScenes([...scenes,{text:"",imageUrls:[]}])} className="w-full border border-black bg-black text-white py-2 mb-3 rounded-lg">
          Add Scene
        </button>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition font-semibold"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {loading ? "Creating..." : "Create"}
        </button>
      </div>

      {/* CENTER PANEL - VIDEO PREVIEW */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black border-x animate-fadeIn">
        {videoUrl ? (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <video src={videoUrl} controls className="max-h-[70vh] rounded-lg shadow-lg border-2 border-purple-600" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg blur opacity-20 pointer-events-none"></div>
            </div>
            <button
              onClick={downloadVideo}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 font-semibold transition"
            >
              Download Video
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Film size={64} className="text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Your masterpiece awaits</p>
            <p className="text-gray-500 text-sm mt-2">Click Generate to bring your story to life</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - OTHER FIELDS */}
      <div className="w-[400px] border-l p-4 overflow-y-auto bg-black animate-slideInRight">

        <h3 className="text-lg font-bold text-white mb-4">Styling</h3>

        <div className="space-y-3">

          {/* Font and Font Size in Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Font</label>
              <select
                value={font}
                onChange={e => setFont(e.target.value)}
                className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="poppins-regular">Poppins (Default)</option>
                <option value="poppins-bold">Poppins Bold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Font Size</label>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value)}
                className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Animation Effect - Full Width */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Animation Effect</label>
            <select
              value={style.effect}
              onChange={e =>
                setStyle(prev => ({
                  ...prev,
                  effect: e.target.value
                }))
              }
              className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="none">No Animation</option>
              <option value="zoom">Zoom (Recommended)</option>
              <option value="fade">Fade</option>
              <option value="slide_left">Slide Left</option>
              <option value="slide_right">Slide Right</option>
            </select>
          </div>

          {/* Colors in Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Text Color</label>
              <input type="color" value={style.color} onChange={e=>setStyle({...style,color:e.target.value})} className="w-full h-10 cursor-pointer rounded-lg border border-black focus:outline-none focus:ring-2 focus:ring-purple-600"/>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Background Color</label>
              <input type="color" value={style.bg.slice(0, 7)} onChange={e=>setStyle({...style,bg:e.target.value+"88"})} className="w-full h-10 cursor-pointer rounded-lg border border-black focus:outline-none focus:ring-2 focus:ring-purple-600"/>
            </div>
          </div>

          {/* Text Alignment/Position - Full Width */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Text Position</label>
            <select value={style.align} onChange={e=>setStyle({...style,align:e.target.value})} className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600">
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          {/* BG Music Upload - Full Width */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">Background Music</label>
            <input
              type="file"
              accept="audio/*"
              onChange={e=>{
                const file = e.target.files?.[0] || null

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
              className="w-full border border-black bg-black text-white p-2 rounded-lg file:bg-purple-600 file:text-white file:border-0 file:rounded-lg file:cursor-pointer"
            />
          </div>

          {/* BG Music URL - Full Width */}
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
            className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />

          {/* AUDIO PREVIEW BUTTON - Only for direct uploads */}
          {audioPreview && (
            <button
              onClick={() => openAudioModal("bgm")}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 transition"
            >
              <Play size={18} />
              Preview Audio
            </button>
          )}

          {/* Volume and Speech Speed in Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2 text-white">Music Volume</label>
              <input
                type="number"
                min="0"
                max="100"
                value={bgVolume}
                onChange={(e)=>{
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                  setBgVolume(val)
                }}
                className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="0-100"
              />
              <span className="text-xs text-gray-400">{bgVolume}%</span>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white">
                Speech Speed
              </label>

              <select
                value={speechRate}
                onChange={(e)=>setSpeechRate(e.target.value)}
                className="w-full border border-black bg-black text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs"
              >
              <option value="-50%">0.5x</option>
              <option value="-20%">0.8x</option>
              <option value="+0%">1.0x</option>
              <option value="+30%">1.3x</option>
              <option value="+50%">1.5x</option>
              <option value="+80%">1.8x</option>
              <option value="+100%">2.0x</option>
            </select>
            </div>
          </div>

        </div>

      </div>
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

      {/* VOICE PREVIEW MODAL - Simple with audio element */}
      {voicePreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <Volume2 size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold">Voice Preview</h2>
              </div>
              <button onClick={closeVoicePreviewModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <audio 
              ref={voiceAudioRef} 
              src={audioPreview || undefined}
              onEnded={() => setIsVoicePlaying(false)}
            />

            <div className="flex gap-3">
              <button
                onClick={toggleVoicePlayPause}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition transform hover:scale-105"
              >
                {isVoicePlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={closeVoicePreviewModal}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR BGM AUDIO PREVIEW */}
      {audioModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <Volume2 size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold">Audio Preview</h2>
              </div>
              <button onClick={closeAudioModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <div ref={containerRef} className="mb-6 p-4 bg-gray-50 rounded-lg" />

            <div className="flex gap-3">
              <button
                onClick={() => wavesurferRef.current?.playPause()}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition transform hover:scale-105"
              >
                Play / Pause
              </button>
              <button
                onClick={closeAudioModal}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRightHeader {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.6s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out 0.3s both;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out 0.3s both;
        }

        .animate-slideInRight:first-of-type {
          animation: slideInRightHeader 0.5s ease-out 0.4s both;
        }

        /* Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #000;
        }

        ::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #374151;
        }

        /* Field Border Enhancement */
        input[type="text"],
        input[type="number"],
        input[type="file"],
        select,
        textarea {
          border-color: #1f2937 !important;
          transition: all 0.3s ease;
        }

        input[type="text"]:hover,
        input[type="number"]:hover,
        input[type="file"]:hover,
        select:hover,
        textarea:hover {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.2);
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        input[type="file"]:focus,
        select:focus,
        textarea:focus {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
        }

        input[type="color"] {
          border-color: #1f2937 !important;
          transition: all 0.3s ease;
        }

        input[type="color"]:hover {
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.2);
        }

        button {
          transition: all 0.3s ease;
        }

        button:not(.bg-purple-600):not(.bg-purple-700):not(.bg-red-600):not(.bg-blue-600) {
          border-color: #1f2937;
        }

        button:not(.bg-purple-600):not(.bg-purple-700):not(.bg-red-600):not(.bg-blue-600):hover {
          border-color: #7c3aed;
          box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.2);
        }
      `}</style>
    </div>
  )
}
