"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import {
  Palette,
  Sparkles,
  Download,
  Loader2,
  ChevronDown
} from "lucide-react"

const API = "http://127.0.0.1:8000"

export default function Page() {

  const router = useRouter()

  const [loadingStory, setLoadingStory] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)

  const [coloringBook, setColoringBook] = useState<any>(null)

  const [pdfTitle, setPdfTitle] = useState("coloring-book")

  const [openDropdowns, setOpenDropdowns] = useState({
    style: false,
    audience: false,
    niche: false,
    mood: false,
    format: false,
    pageSize: false
  })

  const [form, setForm] = useState({
    book_idea: "",
    style: "Cute Animals",
    audience: "Kids",
    niche: "Animals",
    mood: "Cute",
    number_of_pages: 1,
    number_of_characters: 2,
    aspect_ratio: "3:4",
    page_size: "8.5 x 11"
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

    if (!form.book_idea) {
      alert("Enter coloring book idea")
      return
    }

    setLoadingStory(true)

    try {

      const res = await fetch(`${API}/comic/generate-coloring-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!data.success) {
        alert("Failed generating coloring book")
        return
      }

      setColoringBook(data.coloring_book)

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

    if (!coloringBook) return

    setLoadingImages(true)

    const updatedPages = [...coloringBook.pages]

    for (let i = 0; i < updatedPages.length; i++) {

      const page = updatedPages[i]

      try {

        const res = await fetch(`${API}/comic/generate-image`, {
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

        setColoringBook({
          ...coloringBook,
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

      const elements = document.querySelectorAll(".coloring-page-export")

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      for (let i = 0; i < elements.length; i++) {

        const canvas = await html2canvas(
          elements[i] as HTMLElement,
          {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
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

      case "3:4":
        return {
          width: "100%",
          maxWidth: "700px",
          aspectRatio: "3 / 4"
        }

      case "2:3":
        return {
          width: "100%",
          maxWidth: "750px",
          aspectRatio: "2 / 3"
        }

      case "1:1":
        return {
          width: "100%",
          maxWidth: "650px",
          aspectRatio: "1 / 1"
        }

      default:
        return {
          width: "100%",
          maxWidth: "700px",
          aspectRatio: "3 / 4"
        }
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}

      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between bg-black">

        <div>
          <h1 className="text-2xl font-bold text-white">
            Amazon KDP Coloring Book Generator
          </h1>

          <p className="text-zinc-400 text-sm">
            Create printable coloring books for Amazon KDP
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
                Coloring Book Idea
              </label>

              <textarea
                value={form.book_idea}
                onChange={(e) => setForm({
                  ...form,
                  book_idea: e.target.value
                })}
                placeholder="Cute jungle animals for kids or Easy farm animals coloring pages"
                className="w-full h-48 rounded-2xl bg-zinc-950 border border-zinc-800 p-4 outline-none resize-vertical text-white focus:border-yellow-500"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all text-white"
                >
                  <span>{form.style}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.style ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.style && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10 animate-in fade-in duration-200">
                    {["Cute Animals", "Kawaii", "Simple Kids", "Bold Outline", "Easy Coloring", "Fantasy Coloring", "Mandala", "Cartoon Animals", "Dinosaurs", "Princess"].map((style) => (
                      <div
                        key={style}
                        onClick={() => {
                          setForm({ ...form, style })
                          toggleDropdown('style')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${form.style === style
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all text-white"
                >
                  <span>{form.audience}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.audience ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.audience && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["Kids", "Teenagers", "Adults"].map((audience) => (
                      <div
                        key={audience}
                        onClick={() => {
                          setForm({ ...form, audience })
                          toggleDropdown('audience')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${form.audience === audience
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <div
                    key={num}
                    onClick={() => setForm({ ...form, number_of_pages: num })}
                    className={`px-2 py-2 rounded-lg cursor-pointer transition-all text-center text-sm ${form.number_of_pages === num
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all text-white"
                >
                  <span>{form.niche}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.niche ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.niche && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["Animals", "Dinosaurs", "Princesses", "Vehicles", "Farm Animals", "Ocean Life", "Fantasy Creatures", "Jungle Animals", "Halloween", "Christmas", "Unicorns", "Space"].map((niche) => (
                      <div
                        key={niche}
                        onClick={() => {
                          setForm({ ...form, niche })
                          toggleDropdown('niche')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${form.niche === niche
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all text-white"
                >
                  <span>{form.mood}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.mood ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.mood && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["Cute", "Happy", "Playful", "Relaxing", "Whimsical", "Cozy", "Fun", "Friendly"].map((mood) => (
                      <div
                        key={mood}
                        onClick={() => {
                          setForm({ ...form, mood })
                          toggleDropdown('mood')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${form.mood === mood
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between hover:border-yellow-500 transition-all text-white"
                >

                  <div className="flex flex-col items-start">

                    <span className="text-sm font-semibold text-white">

                      {form.aspect_ratio === "3:4"
                        ? "KDP Coloring Page"
                        : form.aspect_ratio === "2:3"
                          ? "Large Coloring Book"
                          : "Square Coloring Page"}

                    </span>

                    <span className="text-xs text-zinc-400">

                      {form.aspect_ratio === "3:4"
                        ? "Perfect printable coloring page"
                        : form.aspect_ratio === "2:3"
                          ? "Best for Amazon KDP interiors"
                          : "Great for activity books"}

                    </span>

                  </div>

                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openDropdowns.format ? "rotate-180" : ""
                      }`}
                  />

                </button>

                {openDropdowns.format && (

                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-950 border border-yellow-500 rounded-2xl overflow-hidden z-50 shadow-2xl">

                    {[
                      {
                        value: "3:4",
                        title: "KDP Coloring Page",
                        description: "Perfect printable coloring page"
                      },
                      {
                        value: "2:3",
                        title: "Large Coloring Book",
                        description: "Best for Amazon KDP interiors"
                      },
                      {
                        value: "1:1",
                        title: "Square Coloring Page",
                        description: "Great for activity books"
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
                        className={`px-5 py-4 cursor-pointer transition-all border-l-4 ${form.aspect_ratio === value
                          ? "bg-yellow-500 text-black border-l-yellow-500"
                          : "bg-zinc-950 text-white border-l-transparent hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
                          }`}
                      >

                        <div className="font-semibold text-sm">
                          {title}
                        </div>

                        <div
                          className={`text-xs mt-1 ${form.aspect_ratio === value
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

            {/* PAGE SIZE DROPDOWN */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Page Size
              </label>

              <div className="relative">
                <button
                  onClick={() => toggleDropdown('pageSize')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 flex items-center justify-between text-sm hover:border-yellow-500 transition-all text-white"
                >
                  <span>{form.page_size}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdowns.pageSize ? 'rotate-180' : ''}`} />
                </button>

                {openDropdowns.pageSize && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden z-10">
                    {["8.5 x 11", "6 x 9", "A4", "Square"].map((size) => (
                      <div
                        key={size}
                        onClick={() => {
                          setForm({ ...form, page_size: size })
                          toggleDropdown('pageSize')
                        }}
                        className={`px-4 py-2 cursor-pointer transition-all text-sm border-l-4 ${form.page_size === size
                          ? "bg-yellow-500 text-black font-semibold border-l-yellow-500"
                          : "bg-zinc-950 text-white border-l-black hover:bg-yellow-500 hover:text-black hover:border-l-yellow-500"
                          }`}
                      >
                        {size}
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
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Step 1: Generate Ideas
                </>
              )}
            </button>

            <button
              onClick={generateImages}
              disabled={loadingImages || !coloringBook}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-black px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
            >
              {loadingImages ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Palette className="w-5 h-5" />
                  Step 2: Generate Images
                </>
              )}
            </button>

          </div>

        </div>

        {/* RIGHT CONTENT - PAGES */}

        <div className="space-y-8">

          {/* COLORING PAGES */}

          {coloringBook?.pages?.map((page: any, index: number) => (
            <div
              key={page.page_number}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 overflow-hidden"
            >

              <h3 className="text-sm text-zinc-400 mb-2">
                Page {page.page_number}
              </h3>

              <h3 className="text-sm text-zinc-400 mb-2">
                Coloring Page Prompt
              </h3>

              <textarea
                value={page.final_prompt}
                onChange={(e) => {

                  const updated = [...coloringBook.pages]

                  updated[index].final_prompt = e.target.value

                  setColoringBook({
                    ...coloringBook,
                    pages: updated
                  })
                }}
                className="w-full h-48 bg-black border border-zinc-800 rounded-xl p-4 mb-5 resize-vertical text-white focus:border-yellow-500"
              />

              <div className="flex flex-col items-center">

                {/* PAGE NUMBER */}
                <div className="mb-3 text-center">
                  <span className="bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                    Page {page.page_number}
                  </span>
                </div>

                <div
                  className="coloring-page-export relative overflow-hidden bg-white"
                  style={getAspectRatioSize()}
                >

                  {page.image_url ? (

                    <img
                      src={page.image_url}
                      alt="coloring-page"
                      className="w-full h-full object-contain p-2"
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
