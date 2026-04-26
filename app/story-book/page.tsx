
"use client"

import { useState } from "react"

export default function BookGeneratorPage() {
  const [topic, setTopic] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [genre, setGenre] = useState("Adventure")
  const [ageGroup, setAgeGroup] = useState("6-10")

  // changed from Image Style -> Book Cover Style
  const [coverStyle, setCoverStyle] = useState("Premium Illustrated")

  // added book cover aspect ratio
  const [coverAspectRatio, setCoverAspectRatio] = useState("2:3")

  const [chapters, setChapters] = useState("5")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [bookContent, setBookContent] = useState("")
  const [coverImage, setCoverImage] = useState("")

  const handleCreateBook = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic")
      return
    }

    if (!authorName.trim()) {
      setError("Please enter the author's name")
      return
    }

    setLoading(true)
    setError("")
    setBookContent("")
    setCoverImage("")

    try {
      const response = await fetch("http://127.0.0.1:8000/create-book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          author_name: authorName,
          genre,
          age_group: ageGroup,
          cover_style: coverStyle,
          cover_aspect_ratio: coverAspectRatio,
          chapters: Number(chapters),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.detail || "Failed to create book")
        return
      }

      setBookContent(data.book_content || "")
      setCoverImage(data.cover_image_url || "")
    } catch (error) {
      console.error(error)
      setError("Something went wrong while creating the book")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (imageUrl: string) => {
    if (!imageUrl) return

    const downloadUrl = `http://127.0.0.1:8000/download-image?image_url=${encodeURIComponent(
      imageUrl
    )}`

    const link = document.createElement("a")
    link.href = downloadUrl
    link.setAttribute("download", "book-cover.png")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-6xl rounded-3xl border border-gray-200 p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-black">
          AI Story Book Generator
        </h1>

        <p className="mb-8 text-gray-600">
          Generate complete story books with professional book cover,
          copyright page, dedication, introduction, table of contents,
          and full chapter-by-chapter content.
        </p>

        <div className="grid gap-6">

          {/* Story Topic */}
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Enter Story Topic
            </label>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Example: A brave little turtle that saves the ocean"
              className="min-h-[150px] w-full rounded-2xl border border-gray-300 p-4 text-black outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Author Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Author Name
            </label>

            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Example: Steven Emmanuel"
              className="w-full rounded-2xl border border-gray-300 p-4 text-black outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Genre + Age Group */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Select Genre
              </label>

              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 p-4 text-black"
              >
                <option>Adventure</option>
                <option>Fantasy</option>
                <option>Educational</option>
                <option>Science Fiction</option>
                <option>Fairy Tale</option>
                <option>Motivational</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Select Age Group
              </label>

              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 p-4 text-black"
              >
                <option>3-5</option>
                <option>6-10</option>
                <option>11-15</option>
                <option>16+</option>
              </select>
            </div>
          </div>

          {/* Cover Style + Cover Aspect Ratio */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Book Cover Style
              </label>

              <select
                value={coverStyle}
                onChange={(e) => setCoverStyle(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 p-4 text-black"
              >
                <option>Premium Illustrated</option>
                <option>Minimal Modern</option>
                <option>Luxury Publishing Style</option>
                <option>Fantasy Cinematic</option>
                <option>Children Storybook Classic</option>
                <option>Watercolor Premium Cover</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">
                Book Cover Aspect Ratio
              </label>

              <select
                value={coverAspectRatio}
                onChange={(e) => setCoverAspectRatio(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 p-4 text-black"
              >
                <option>2:3</option>
                <option>1:1</option>
                <option>16:9</option>
                <option>4:5</option>
                <option>3:4</option>
              </select>
            </div>
          </div>

          {/* Chapters */}
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Number of Chapters
            </label>

            <select
              value={chapters}
              onChange={(e) => setChapters(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 p-4 text-black"
            >
              <option>2</option>
              <option>3</option>
              <option>5</option>
              <option>7</option>
              <option>10</option>
              <option>12</option>
            </select>
          </div>

          {/* Button */}
          <button
            onClick={handleCreateBook}
            disabled={loading}
            className="rounded-2xl bg-black px-6 py-4 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Creating Complete Book..."
              : "Create Complete Story Book"}
          </button>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          {/* Result */}
          {(coverImage || bookContent) && (
            <div className="rounded-3xl border border-gray-200 bg-white p-8">

              <h2 className="mb-6 text-2xl font-bold text-black">
                Generated Story Book
              </h2>

              {/* Book Cover */}
              {coverImage && (
                <div className="mb-10 rounded-3xl border border-gray-200 p-6">
                  <h3 className="mb-4 text-xl font-bold text-black">
                    Book Cover
                  </h3>

                  <img
                    src={coverImage}
                    alt="Book Cover"
                    className="mx-auto w-full max-w-md rounded-2xl border border-gray-200"
                  />

                  <button
                    onClick={() => handleDownload(coverImage)}
                    className="mt-4 rounded-2xl bg-black px-6 py-3 font-medium text-white"
                  >
                    Download Book Cover
                  </button>
                </div>
              )}

              {/* Book Content */}
              {bookContent && (
                <div className="rounded-3xl border border-gray-200 p-6">
                  <h3 className="mb-4 text-xl font-bold text-black">
                    Full Book Content
                  </h3>
  {/* Import Button */}
      <button
        className="rounded-2xl bg-black px-5 py-2 text-sm font-medium text-white"
      >
        Import
      </button>
                  <div className="whitespace-pre-wrap leading-8 text-gray-800">
                    {bookContent}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}