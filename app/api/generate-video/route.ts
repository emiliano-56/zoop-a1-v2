import { type NextRequest, NextResponse } from "next/server"

// Function to submit video generation task
async function invokeVideoGeneration(
  prompt: string,
  image?: string,
  duration = 6,
  resolution = "768P",
): Promise<string> {
  console.log("🔄 Calling Minimax API with payload preview:", {
    prompt: prompt.substring(0, 100) + "...",
    hasImage: !!image,
    duration,
    resolution,
    model: "MiniMax-Hailuo-02",
  })

  // Validate duration and resolution combination for MiniMax-Hailuo-02
  // This validation is now primarily handled on the client-side, but kept for robustness
  if (duration === 10 && resolution === "1080P") {
    console.warn("⚠️ 1080P not available for 10s duration, switching to 768P")
    resolution = "768P"
  }

  // Ensure valid combinations
  const validCombinations = [
    { duration: 6, resolution: "768P" },
    { duration: 6, resolution: "1080P" },
    { duration: 10, resolution: "768P" },
  ]

  const isValidCombination = validCombinations.some(
    (combo) => combo.duration === duration && combo.resolution === resolution,
  )

  if (!isValidCombination) {
    console.warn(`⚠️ Invalid combination: ${duration}s + ${resolution}, defaulting to 6s + 768P`)
    duration = 6
    resolution = "768P"
  }

  const payload: any = {
    prompt: prompt,
    model: "MiniMax-Hailuo-02",
    duration: duration,
    resolution: resolution,
  }

  // Add image if provided
  if (image) {
    payload.first_frame_image = image
    console.log("🖼️ Including image in payload")
  }

  try {
    const response = await fetch("https://api.minimax.io/v1/video_generation", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log("📡 Minimax API response status:", response.status)
    console.log("📡 Minimax API response:", responseText)

    if (!response.ok) {
      console.error("❌ Minimax API error:", response.status, responseText)
      throw new Error(`Minimax API error (${response.status}): ${responseText}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("❌ Failed to parse Minimax response as JSON:", parseError)
      throw new Error(`Invalid JSON response from Minimax: ${responseText}`)
    }

    if (!result.task_id) {
      console.error("❌ No task_id in response:", result)
      throw new Error("No task_id received from Minimax API")
    }

    console.log("✅ Task ID received:", result.task_id)
    return result.task_id
  } catch (fetchError) {
    console.error("💥 Network error calling Minimax API:", fetchError)
    throw new Error(
      `Failed to call Minimax API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
    )
  }
}

// Function to query video generation status
async function queryVideoGeneration(taskId: string): Promise<{ fileId: string; status: string }> {
  const response = await fetch(`https://api.minimax.io/v1/query/video_generation?task_id=${taskId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
  })

  const responseText = await response.text()
  console.log(`Status check for task ${taskId}:`, responseText)

  if (!response.ok) {
    throw new Error(`Failed to query video status: ${responseText}`)
  }

  const result = JSON.parse(responseText)
  const status = result.status

  switch (status) {
    case "Preparing":
      return { fileId: "", status: "Preparing" }
    case "Queueing":
      return { fileId: "", status: "Queueing" }
    case "Processing":
      return { fileId: "", status: "Processing" }
    case "Success":
      return { fileId: result.file_id, status: "Success" }
    case "Fail":
      return { fileId: "", status: "Fail" }
    default:
      return { fileId: "", status: "Unknown" }
  }
}

// Function to get video download URL
async function fetchVideoResult(fileId: string): Promise<string> {
  const response = await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${fileId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
  })

  const responseText = await response.text()
  console.log(`File retrieval for ${fileId}:`, responseText)

  if (!response.ok) {
    throw new Error(`Failed to retrieve video file: ${responseText}`)
  }

  const result = JSON.parse(responseText)
  const downloadUrl = result.file?.download_url

  if (!downloadUrl) {
    throw new Error("No download URL found in response")
  }

  return downloadUrl
}

async function generateVideoWithSora2(
  prompt: string,
  duration: number,
  resolution: string,
  aspectRatio: string,
): Promise<{ taskId: string }> {
  console.log("[v0] Calling Sora2 Pro API with payload:", {
    prompt: prompt.substring(0, 100) + "...",
    duration,
    resolution,
    aspectRatio,
  })

  const payload = {
    model: "sora2",
    task_type: "sora2-pro-video",
    input: {
      prompt: prompt,
      aspect_ratio: aspectRatio,
      resolution: resolution,
      duration: duration,
    },
  }

  try {
    const response = await fetch("https://api.goapi.ai/api/v1/task", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.GOAPI_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log("[v0] Sora2 API response status:", response.status)
    console.log("[v0] Sora2 API response:", responseText)

    if (!response.ok) {
      console.error("[v0] Sora2 API error:", response.status, responseText)
      throw new Error(`Sora2 API error (${response.status}): ${responseText}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] Failed to parse Sora2 response as JSON:", parseError)
      throw new Error(`Invalid JSON response from Sora2: ${responseText}`)
    }

    // GoAPI returns task_id in the response
    if (!result.data?.task_id) {
      console.error("[v0] No task_id in response:", result)
      throw new Error("No task_id received from Sora2 API")
    }

    console.log("[v0] Task ID received:", result.data.task_id)
    return { taskId: result.data.task_id }
  } catch (fetchError) {
    console.error("[v0] Network error calling Sora2 API:", fetchError)
    throw new Error(
      `Failed to call Sora2 API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
    )
  }
}

async function checkSora2TaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string }> {
  try {
    const response = await fetch(`https://api.goapi.ai/api/v1/task/${taskId}`, {
      method: "GET",
      headers: {
        "X-API-Key": process.env.GOAPI_KEY || "",
      },
    })

    const responseText = await response.text()
    console.log(`[v0] Status check for task ${taskId}:`, responseText)

    if (!response.ok) {
      throw new Error(`Failed to query video status: ${responseText}`)
    }

    const result = JSON.parse(responseText)
    const status = result.data?.status

    console.log("[v0] Task status:", status)

    if (status === "completed") {
      const videoUrl = result.data?.output?.video || result.data?.output?.video_url
      if (videoUrl) {
        console.log("[v0] Video URL found:", videoUrl)
        return {
          status: "completed",
          videoUrl: videoUrl,
        }
      } else {
        console.error("[v0] Status is completed but no video URL found in output:", result.data?.output)
        return { status: "processing" } // Continue polling if video URL missing
      }
    } else if (status === "failed") {
      return { status: "failed" }
    } else {
      return { status: status || "processing" }
    }
  } catch (error) {
    console.error("[v0] Error checking task status:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Video generation request received")

  try {
    if (!process.env.GOAPI_KEY) {
      console.error("[v0] GOAPI_KEY not found in environment variables")
      return NextResponse.json({ error: "GoAPI key not configured" }, { status: 500 })
    }

    console.log("[v0] API key found, length:", process.env.GOAPI_KEY.length)

    const body = await request.json()
    const { prompt, duration = 4, resolution = "720p", aspect_ratio = "16:9" } = body

    console.log("[v0] Request parameters:", {
      prompt: prompt?.substring(0, 100) + "...",
      duration,
      resolution,
      aspect_ratio,
    })

    if (!prompt) {
      console.error("[v0] No prompt provided")
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (![4, 8, 12].includes(duration)) {
      console.error("[v0] Invalid duration:", duration)
      return NextResponse.json({ error: "Duration must be 4, 8, or 12 seconds" }, { status: 400 })
    }

    if (!["720p", "1080p"].includes(resolution)) {
      console.error("[v0] Invalid resolution:", resolution)
      return NextResponse.json({ error: "Resolution must be 720p or 1080p" }, { status: 400 })
    }

    if (!["16:9", "9:16"].includes(aspect_ratio)) {
      console.error("[v0] Invalid aspect ratio:", aspect_ratio)
      return NextResponse.json({ error: "Aspect ratio must be 16:9 or 9:16" }, { status: 400 })
    }

    console.log("[v0] Submitting video generation task to Sora2...")

    // Step 1: Submit video generation task
    const { taskId } = await generateVideoWithSora2(prompt, duration, resolution, aspect_ratio)
    console.log("[v0] Video generation task submitted successfully, task ID:", taskId)

    // Step 2: Poll for completion
    const maxAttempts = 120 // 20 minutes max (10 second intervals)
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10 seconds
      attempts++

      try {
        const { status, videoUrl } = await checkSora2TaskStatus(taskId)

        console.log(`[v0] Attempt ${attempts}: Status = ${status}`)

        if (status === "completed" && videoUrl) {
          console.log("[v0] Video generated successfully!")
          return NextResponse.json({
            success: true,
            task_id: taskId,
            video_url: videoUrl,
            status: "completed",
            message: "Video generated successfully with Sora2 Pro!",
          })
        } else if (status === "failed") {
          return NextResponse.json(
            {
              error: "Video generation failed",
              task_id: taskId,
              status: "failed",
            },
            { status: 500 },
          )
        }

        // Continue polling for pending/processing
      } catch (error) {
        console.error(`[v0] Error checking task status (attempt ${attempts}):`, error)

        // If we're near the end, return the error
        if (attempts >= maxAttempts - 1) {
          return NextResponse.json(
            {
              error: "Failed to check task status",
              details: error instanceof Error ? error.message : "Unknown error",
              task_id: taskId,
            },
            { status: 500 },
          )
        }
      }
    }

    // Timeout reached
    return NextResponse.json(
      {
        error: "Video generation timed out",
        details: "The video is still being processed. Please try again later.",
        task_id: taskId,
      },
      { status: 408 },
    )
  } catch (error) {
    console.error("[v0] Critical error in video generation:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
