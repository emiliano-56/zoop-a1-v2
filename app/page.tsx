'use client'

import { useState } from 'react'

export default function HomePage() {

  const [video, setVideo] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)

  const [response, setResponse] = useState<any>(null)

  const [error, setError] = useState('')


  // ====================================
  // HANDLE GENERATE
  // ====================================

  const handleGenerate = async () => {

    if (!video) {
      alert('Please upload a video')
      return
    }

    try {

      setLoading(true)

      setError('')

      setResponse(null)

      // ====================================
      // CREATE FORM DATA
      // ====================================

      const formData = new FormData()

      formData.append('video', video)

      // ====================================
      // SEND TO BACKEND
      // ====================================

      const res = await fetch(
        'http://127.0.0.1:8000/video/video-to-video',
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await res.json()

      // ====================================
      // HANDLE RESPONSE
      // ====================================

      if (!res.ok) {
        throw new Error(
          data.detail || 'Something went wrong'
        )
      }

      setResponse(data)

    } catch (err: any) {

      console.error(err)

      setError(err.message)

    } finally {

      setLoading(false)

    }
  }


  // ====================================
  // UI
  // ====================================

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">

        {/* ==================================== */}
        {/* TITLE */}
        {/* ==================================== */}

        <div>
          <h1 className="text-4xl font-bold">
            AI Video To Video
          </h1>

          <p className="text-zinc-400 mt-2">
            Upload a video and transform it into anime style.
          </p>
        </div>


        {/* ==================================== */}
        {/* VIDEO INPUT */}
        {/* ==================================== */}

        <div className="space-y-2">

          <label className="text-sm text-zinc-400">
            Upload Video
          </label>

          <input
            type="file"
            accept="video/*"
            onChange={(e) => {

              if (e.target.files?.[0]) {
                setVideo(e.target.files[0])
              }

            }}
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

        </div>


        {/* ==================================== */}
        {/* BUTTON */}
        {/* ==================================== */}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 transition-all rounded-2xl p-4 font-semibold disabled:opacity-50"
        >

          {loading ? 'Generating...' : 'Generate AI Video'}

        </button>


        {/* ==================================== */}
        {/* ERROR */}
        {/* ==================================== */}

        {error && (

          <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-2xl">

            {error}

          </div>

        )}


        {/* ==================================== */}
        {/* RESPONSE */}
        {/* ==================================== */}

        {response && (

          <div className="bg-zinc-800 rounded-2xl p-4 overflow-auto">

            <h2 className="text-lg font-semibold mb-4">
              API Response
            </h2>

            <pre className="text-sm whitespace-pre-wrap break-all">
              {JSON.stringify(response, null, 2)}
            </pre>

          </div>

        )}

      </div>

    </main>
  )
}

