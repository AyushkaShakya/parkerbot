// app/api/upload/route.js
import { NextResponse } from "next/server";
import { processPDF } from "@/lib/rag";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await processPDF(buffer, file.name);

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      chunks: result.chunks,
      pages: result.pages,
      message: `Successfully processed ${result.pages} pages into ${result.chunks} chunks`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  }
}