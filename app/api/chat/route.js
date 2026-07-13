// app/api/chat/route.js
// Chat API for StudyMate AI.
// Two modes:
//  - No PDF uploaded  -> generalChat()   (natural chit-chat)
//  - PDF active       -> answerQuestion() (chit-chat + grounded document Q&A)

import { NextResponse } from "next/server";
import { answerQuestion, generalChat } from "@/lib/rag";

export async function POST(request) {
  try {
    const { messages, fileName } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is missing from .env.local" },
        { status: 500 }
      );
    }

    // Get the latest user question
    const question = messages[messages.length - 1].content;

    // Get chat history (excluding last message)
    const chatHistory = messages.slice(0, -1);

    // Route based on whether a document is active:
    // - fileName present  -> RAG mode (grounded answers + natural conversation)
    // - no fileName       -> general conversation mode
    const reply = fileName
      ? await answerQuestion(fileName, question, chatHistory)
      : await generalChat(question, chatHistory);

    return NextResponse.json({ reply });
  } catch (error) {
    // Log the FULL error (message + stack trace) so we can see exactly what
    // broke and where, instead of just seeing "500" in the terminal.
    console.error("=== /api/chat ERROR ===");
    console.error(error);
    console.error("=== END ERROR ===");

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}