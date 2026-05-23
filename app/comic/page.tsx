"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import {
  BookOpen,
  Sparkles,
  Download,
  Users,
  Image as ImageIcon,
  Loader2,
  ChevronDown
} from "lucide-react"

const API = "http://127.0.0.1:8000"

export default function Page() {

  const router = useRouter()

  const [loadingStory, setLoadingStory] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)

  const [comic, setComic] = useState<any>(null)

  const [pdfTitle, setPdfTitle] = useState("comic-book")

  const [openDropdowns, setOpenDropdowns] = useState({
    style: false,
    audience: false,
    niche: false,
    mood: false,
    format: false
  })

  const [form, setForm] = useState({
    story_idea: "",
    style: "Pixar",
    audience: "Kids",
    niche: "Adventure",
    mood: "Cute",
    number_of_pages: 1,
    number_of_characters: 2,
    aspect_ratio: "16:9"
  })

  const toggleDropdown = (key: keyof typeof openDropdowns) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // =====================================================
  // GENERATE STORY
  // =====================================================

  async function generateStory() {

    if (!form.story_idea) {
      alert("Enter story idea")
      return
    }

    setLoadingStory(true)

    try {

      const res = await fetch(`${API}/coloring/generate-comic-story`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!data.success) {
        alert("Failed generating story")
        return
      }

      setComic(data.comic)

    } catch (err) {
      console.log(err)
      alert("Something went wrong")
    }

    setLoadingStory(false)
  }

  // =====================================================
  // GENERATE IMAGES
  // =====================================================

  async function generateImages() {

    if (!comic) return

    setLoadingImages(true)

    const updatedPages = [...comic.pages]

    for (let i = 0; i < updatedPages.length; i++) {

      const page = updatedPages[i]

      try {

        const res = await fetch(`${API}/coloring/generate-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: page.final_prompt,
            aspect_ratio: form.aspect_ratio
          })
        })

        const data = await res.json()

        const imageRes = await fetch(data.image_url)

        const blob = await imageRes.blob()

        const base64 = await new Promise<string>((resolve) => {

          const reader = new FileReader()

          reader.onloadend = () => {
            resolve(reader.result as string)
          }

          reader.readAsDataURL(blob)
        })

        updatedPages[i].image_url = base64

        setComic({
          ...comic,
          pages: [...updatedPages]
        })

      } catch (err) {
        console.log(err)
      }
    }

    setLoadingImages(false)
  }

  // =====================================================
  // EXPORT PDF
  // =====================================================

 async function exportPDF() {

  setLoadingPDF(true)

  try {

    const elements = document.querySelectorAll(".comic-page-export")

    const pdf = new jsPDF({
      orientation:
        form.aspect_ratio === "9:16"
          ? "portrait"
          : "landscape",
      unit: "mm",
      format: "a4"
    })

    for (let i = 0; i < elements.length; i++) {

      const canvas = await html2canvas(
        elements[i] as HTMLElement,
        {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffff"
        }
      )

      const imgData = canvas.toDataURL("image/jpeg", 1.0)

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // IMAGE SIZE
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // FIT IMAGE INSIDE PDF
      const ratio = Math.min(
        pageWidth / imgWidth,
        pageHeight / imgHeight
      )

      const finalWidth = imgWidth * ratio
      const finalHeight = imgHeight * ratio

      // CENTER IMAGE
      const x = (pageWidth - finalWidth) / 2
      const y = (pageHeight - finalHeight) / 2

      if (i > 0) {
        pdf.addPage()
      }

      pdf.addImage(
        imgData,
        "JPEG",
        x,
        y,
        finalWidth,
        finalHeight
      )
    }

    pdf.save(`${pdfTitle}.pdf`)

  } catch (err) {

    console.log(err)

  } finally {

    setLoadingPDF(false)

  }
}

  const getAspectRatioSize = () => {

  switch (form.aspect_ratio) {

    // CINEMATIC
    case "16:9":
      return {
        width: "100%",
        maxWidth: "950px",
        aspectRatio: "16 / 9"
      }

    // MOBILE COMIC
    case "9:16":
      return {
        width: "100%",
        maxWidth: "420px",
        aspectRatio: "9 / 16"
      }

    // COLORING PAGE / POSTER
    case "1:1":
      return {
        width: "100%",
        maxWidth: "650px",
        aspectRatio: "1 / 1"
      }

    // DEFAULT COMIC BOOK
    case "4:3":
    default:
      return {
        width: "100%",
        maxWidth: "850px",
        aspectRatio: "4 / 3"
      }
  }
}

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}

      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Amazon KDP Comic Generator
          </h1>

          <p className="text-zinc-400 text-sm">
            Create and publish professional comics to KDP
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={pdfTitle}
            onChange={(e) => setPdfTitle(e.target.value)}
            placeholder="Enter PDF title"
            className="bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl outline-none focus:border-yellow-500 transition-colors"
          />

          <button
            onClick={() => router.push('/dashboard')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3 rounded-xl font-semibold transition-all"
          >
            Back to Home
          </button>

          <button
            onClick={exportPDF}
            disabled={loadingPDF}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-black px-5 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all"
          >
          {loadingPDF ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export PDF
            </>
          )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 p-6">

        {/* LEFT SIDEBAR - CONTROLS */}

        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 h-fit sticky top-6">

          <div className="space-y-5">

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Story Idea
              </label>

              <textarea
                value={form.story_idea}
                onChange={(e) => setForm({
                  ...form,
                  story_idea: e.target.value
                })}
                placeholder="A snail exploring a magical garden"
                className="w-full h-48 rounded-2xl bg-zinc-950 border border-zinc-800 p-4 outline-none resize-vertical"
              />
            </div>

            {/* STYLE DROPDOWN */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Style
              </label>

              <div className="relative">
                <button
                  onClick={() => toggleDropdown('style')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all"
                >
                  <span>{form.style}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.style ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.style && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10 animate-in fade-in duration-200">
                    {["Pixar", "Manga", "Anime", "Disney", "Comic Book", "3D Cartoon"].map((style) => (
                      <div
                        key={style}
                        onClick={() => {
                          setForm({ ...form, style })
                          toggleDropdown('style')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${
                          form.style === style
                            ? "bg-yellow-500 text-black font-semibold border-l-yellow-500"
                            : "bg-zinc-950 text-white border-l-black hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
                        }`}
                      >
                        {style}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AUDIENCE DROPDOWN */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Audience
              </label>

              <div className="relative">
                <button
                  onClick={() => toggleDropdown('audience')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all"
                >
                  <span>{form.audience}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.audience ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.audience && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["Kids", "Teenagers", "Adults"].map((audience) => (
                      <div
                        key={audience}
                        onClick={() => {
                          setForm({ ...form, audience })
                          toggleDropdown('audience')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${
                          form.audience === audience
                            ? "bg-yellow-500 text-black font-semibold border-l-yellow-500"
                            : "bg-zinc-950 text-white border-l-black hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
                        }`}
                      >
                        {audience}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Pages
              </label>

              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <div
                    key={num}
                    onClick={() => setForm({ ...form, number_of_pages: num })}
                    className={`px-2 py-2 rounded-lg cursor-pointer transition-all text-center text-sm ${
                      form.number_of_pages === num
                        ? "bg-yellow-500 text-black font-semibold"
                        : "bg-zinc-950 border border-zinc-800 text-white hover:border-yellow-500"
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Characters
              </label>

              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map(num => (
                  <div
                    key={num}
                    onClick={() => setForm({ ...form, number_of_characters: num })}
                    className={`px-2 py-2 rounded-lg cursor-pointer transition-all text-center text-sm ${
                      form.number_of_characters === num
                        ? "bg-yellow-500 text-black font-semibold"
                        : "bg-zinc-950 border border-zinc-800 text-white hover:border-yellow-500"
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* NICHE DROPDOWN */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Niche
              </label>

              <div className="relative">
                <button
                  onClick={() => toggleDropdown('niche')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all"
                >
                  <span>{form.niche}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.niche ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.niche && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["Adventure", "Fantasy", "Mystery", "Comedy", "Drama", "Sci-Fi"].map((niche) => (
                      <div
                        key={niche}
                        onClick={() => {
                          setForm({ ...form, niche })
                          toggleDropdown('niche')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${
                          form.niche === niche
                            ? "bg-yellow-500 text-black font-semibold border-l-yellow-500"
                            : "bg-zinc-950 text-white border-l-black hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
                        }`}
                      >
                        {niche}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* MOOD DROPDOWN */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Mood
              </label>

              <div className="relative">
                <button
                  onClick={() => toggleDropdown('mood')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all"
                >
                  <span>{form.mood}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.mood ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.mood && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["Cute", "Dark", "Mysterious", "Happy", "Serious", "Playful"].map((mood) => (
                      <div
                        key={mood}
                        onClick={() => {
                          setForm({ ...form, mood })
                          toggleDropdown('mood')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${
                          form.mood === mood
                            ? "bg-yellow-500 text-black font-semibold border-l-yellow-500"
                            : "bg-zinc-950 text-white border-l-black hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
                        }`}
                      >
                        {mood}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* FORMAT DROPDOWN */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Format
              </label>

              <div className="relative">

  <button
    onClick={() => toggleDropdown("format")}
    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between hover:border-yellow-500 transition-all"
  >

    <div className="flex flex-col items-start">

      <span className="text-sm font-semibold text-white">

        {form.aspect_ratio === "4:3"
          ? "Comic Book"
          : form.aspect_ratio === "9:16"
          ? "Mobile Comic"
          : form.aspect_ratio === "1:1"
          ? "Square Poster"
          : "Cinematic"}

      </span>

      <span className="text-xs text-zinc-400">

        {form.aspect_ratio === "4:3"
          ? "Best for comics & storybooks"
          : form.aspect_ratio === "9:16"
          ? "Perfect for TikTok & Shorts"
          : form.aspect_ratio === "1:1"
          ? "Great for coloring pages"
          : "Wide movie-style scenes"}

      </span>

    </div>

    <ChevronDown
      className={`w-4 h-4 transition-transform ${
        openDropdowns.format ? "rotate-180" : ""
      }`}
    />

  </button>

  {openDropdowns.format && (

    <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-yellow-500 rounded-2xl overflow-hidden z-50 shadow-2xl">

      {[
        {
          value: "4:3",
          title: "Comic Book",
          description: "Best for comics & storybooks"
        },
        {
          value: "9:16",
          title: "Mobile Comic",
          description: "Perfect for TikTok & Shorts"
        },
        {
          value: "1:1",
          title: "Square Poster",
          description: "Great for coloring pages"
        },
        {
          value: "16:9",
          title: "Cinematic",
          description: "Wide movie-style scenes"
        }
      ].map(({ value, title, description }) => (

        <div
          key={value}
          onClick={() => {

            setForm({
              ...form,
              aspect_ratio: value
            })

            toggleDropdown("format")
          }}
          className={`px-5 py-4 cursor-pointer transition-all border-l-4 ${
            form.aspect_ratio === value
              ? "bg-yellow-500 text-black border-l-yellow-500"
              : "bg-zinc-950 text-white border-l-transparent hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
          }`}
        >

          <div className="font-semibold text-sm">
            {title}
          </div>

          <div
            className={`text-xs mt-1 ${
              form.aspect_ratio === value
                ? "text-black/70"
                : "text-zinc-400"
            }`}
          >
            {description}
          </div>

        </div>

      ))}

    </div>

  )}

</div>
            </div>

            <button
              onClick={generateStory}
              disabled={loadingStory}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-black px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
            >
              {loadingStory ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Story...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Story
                </>
              )}
            </button>

            <button
              onClick={generateImages}
              disabled={loadingImages || !comic}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-black px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
            >
              {loadingImages ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Character...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Generate Character
                </>
              )}
            </button>

          </div>

        </div>

        {/* RIGHT CONTENT - PAGES AND CHARACTERS */}

        <div className="space-y-8">

          {/* CHARACTERS */}

          {comic?.characters && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6">

              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-yellow-400" />

                <h2 className="text-2xl font-bold">
                  Characters
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {comic.characters.map((char: any, index: number) => (
                  <div
                    key={index}
                    className="bg-black border border-zinc-800 rounded-2xl p-5"
                  >

                    <input
                      value={char.name}
                      onChange={(e) => {

                        const updated = [...comic.characters]

                        updated[index].name = e.target.value

                        setComic({
                          ...comic,
                          characters: updated
                        })
                      }}
                      className="w-full bg-zinc-900 rounded-xl p-3 mb-3 text-lg font-bold"
                    />

                    <textarea
                      value={char.description}
                      onChange={(e) => {

                        const updated = [...comic.characters]

                        updated[index].description = e.target.value

                        setComic({
                          ...comic,
                          characters: updated
                        })
                      }}
                      className="w-full h-32 bg-zinc-900 rounded-xl p-4 resize-vertical"
                    />

                  </div>
                ))}

              </div>

            </div>
          )}

          {/* COMIC PAGES */}

          {comic?.pages?.map((page: any, index: number) => (
            <div
              key={page.page_number}
             className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 overflow-hidden"
            >

              <h3 className="text-sm text-zinc-400 mb-2">
                Page {page.page_number}
              </h3>

              <h3 className="text-sm text-zinc-400 mb-2">
                Editable Prompt
              </h3>

              <textarea
                value={page.final_prompt}
                onChange={(e) => {

                  const updated = [...comic.pages]

                  updated[index].final_prompt = e.target.value

                  setComic({
                    ...comic,
                    pages: updated
                  })
                }}
                className="w-full h-48 bg-black border border-zinc-800 rounded-xl p-4 mb-5 resize-vertical"
              />

              <div className="flex flex-col items-center">

                {/* PAGE NUMBER */}
                <div className="mb-3 text-center">
                  <span className="bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                    Page {page.page_number}
                  </span>
                </div>

              <div
  className="comic-page-export relative overflow-hidden bg-white"
  style={getAspectRatioSize()}
>

                  {page.image_url ? (

                    <img
                      src={page.image_url}
                      alt="comic"
                      className="w-full h-full object-contain p-2 bg-white"
                    />

                  ) : (

                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      Image will appear here
                    </div>

                  )}

                </div>

              </div>

            </div>
          ))}

        </div>

        {/* RIGHT SIDEBAR */}

        

      </div>

    </main>
  )
}
