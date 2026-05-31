import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {

    const body = await req.json();

    const imageUrl = body.imageUrl;

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: "Missing imageUrl"
        },
        {
          status: 400
        }
      );
    }

    // ============================================
    // DOWNLOAD IMAGE
    // ============================================

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }

    // ============================================
    // CONVERT TO BUFFER
    // ============================================

    const arrayBuffer = await response.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    // ============================================
    // CONVERT TO BASE64
    // ============================================

    const base64 = buffer.toString("base64");

    // ============================================
    // MIME TYPE
    // ============================================

    const mimeType =
      response.headers.get("content-type")
      || "image/png";

    return NextResponse.json({
      success: true,
      base64,
      mimeType
    });

  } catch (error: any) {

    console.error(error);

    return NextResponse.json(
      {
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}
