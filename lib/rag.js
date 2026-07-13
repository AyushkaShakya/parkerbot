// lib/rag.js
import Groq from "groq-sdk";
import path from "path";
import { pathToFileURL } from "url";
import fs from "fs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory storage.
// Attached to globalThis so it survives across the separate module instances
// Next.js's dev bundler can create for different API routes (which was causing
// "Document not found" — /api/upload and /api/chat each getting their own Map).
// In production this also gives a single shared instance per server process.
const documentStores = globalThis.__parkerDocumentStores || new Map();
if (!globalThis.__parkerDocumentStores) {
  globalThis.__parkerDocumentStores = documentStores;
}

// ---------------------------------------------------------------------------
// VISION-BASED PDF READING (with a text-extraction safety net)
// Every page is rendered as an image and sent to a vision model to "read" it
// visually — this handles tables and structured content that plain text
// extraction cannot. Vision output is COMBINED with plain extracted text so
// we get both table-reading quality and keyword searchability.
// ---------------------------------------------------------------------------

// Get plain text for each page individually, as a fallback source.
async function extractPerPageTextFallback(fileBuffer) {
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;

  const pageTexts = [];

  await pdfParse(fileBuffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      pageTexts.push(pageText);
      return pageText;
    },
  });

  return pageTexts; // index 0 = page 1, index 1 = page 2, etc.
}

// Render one PDF page to a JPEG image buffer using pdfjs-dist + canvas.
// JPEG at 1.5x scale keeps the request small enough to fit inside Groq's
// free-tier 8000 tokens-per-minute limit (PNG at 2x scale was ~10k tokens
// per request and every call was rejected with 413 rate_limit_exceeded).
async function renderPageToImage(pdf, pageNum) {
  const { createCanvas } = await import("canvas");

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const buffer = canvas.toBuffer("image/jpeg", { quality: 0.85 });

  // DEBUG: save a copy so we can visually inspect what's being sent to the
  // vision model. Safe to remove once you're confident in the pipeline.
  fs.writeFileSync(`debug-page-${pageNum}.jpg`, buffer);

  return buffer.toString("base64");
}

// Send one page image to the vision model and get back transcribed text.
async function transcribePageWithVision(base64Image, pageNum) {
  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3.6-27b",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Transcribe everything on this page exactly as it appears, including any tables (preserve rows/columns clearly), diagrams (describe them briefly), and handwriting. Do not summarize. Do not explain your reasoning. Output ONLY the transcribed content of the page, nothing else.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    // Request size = image tokens + max_tokens, and must stay under the
    // free tier's 8000 tokens-per-minute limit.
    max_tokens: 4000,
  });

  let output = completion.choices[0].message.content || "";

  // The model wraps reasoning in <think>...</think> before its real answer.
  // Try to get the clean answer first. If it's empty (model spent all its
  // tokens thinking), keep the thinking content — it's noisy but contains
  // the actual transcribed data we need (table values, etc.).
  if (output.includes("</think>")) {
    const cleanAnswer = output.split("</think>").pop().trim();
    if (cleanAnswer.length > 40) {
      output = cleanAnswer;
    } else {
      output = output.replace(/<think>/g, "").replace(/<\/think>/g, "").trim();
    }
  }

  return output.trim();
}

// Render + transcribe every page of the PDF using vision, combining with
// plain text extraction for every page.
async function extractTextWithVision(fileBuffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

  const standardFontDataUrl = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts") + "/"
  ).href;

  const data = new Uint8Array(fileBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    standardFontDataUrl,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  // Get the plain-text fallback for every page up front.
  let fallbackPageTexts = [];
  try {
    fallbackPageTexts = await extractPerPageTextFallback(fileBuffer);
  } catch (err) {
    fallbackPageTexts = [];
  }

  let fullText = "";

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const base64Image = await renderPageToImage(pdf, pageNum);

    let visionText = "";
    try {
      visionText = await transcribePageWithVision(base64Image, pageNum);
    } catch (err) {
      console.error(`[page ${pageNum}] VISION ERROR:`, err.message || err);
      visionText = "";
    }

    const fallbackText = fallbackPageTexts[pageNum - 1] || "";

    // Combine BOTH sources: vision transcription (good for tables, layout)
    // + plain text extraction (good for searchable keywords, equations).
    let pageText = "";

    if (visionText.trim().length > 0 && fallbackText.trim().length > 0) {
      pageText = visionText + "\n\n" + fallbackText;
    } else if (visionText.trim().length > 0) {
      pageText = visionText;
    } else {
      pageText = fallbackText;
    }

    console.log(
      `[page ${pageNum}] vision: ${visionText.trim().length} chars, ` +
      `fallback: ${fallbackText.trim().length} chars, ` +
      `combined: ${pageText.trim().length} chars`
    );

    fullText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`;
  }

  return { text: fullText, numPages };
}

// Split text into chunks
function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

// Simple keyword search
function searchChunks(chunks, query, topK = 4) {
  const queryWords = query.toLowerCase()
    .split(" ")
    .filter(w => w.length > 2);

  const scored = chunks.map((chunk) => {
    const chunkLower = chunk.toLowerCase();
    const score = queryWords.reduce((acc, word) => {
      return acc + (chunkLower.includes(word) ? 1 : 0);
    }, 0);
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.chunk);
}

export async function processPDF(fileBuffer, fileName) {
  try {
    const { text, numPages } = await extractTextWithVision(fileBuffer);

    if (!text || text.trim().length === 0) {
      throw new Error("Could not read any content from PDF");
    }

    // DEBUG: dump the full extracted text so we can see exactly what each page
    // contributed (vision transcription vs. fallback). Remove later.
    console.log("=== EXTRACTED TEXT START ===");
    console.log(text);
    console.log("=== EXTRACTED TEXT END ===");

    const chunks = splitIntoChunks(text);

    documentStores.set(fileName, {
      chunks,
      fullText: text,
      pages: numPages,
    });

    return {
      success: true,
      fileName,
      chunks: chunks.length,
      pages: numPages,
    };
  } catch (error) {
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// General chit-chat when no document is loaded.
// ---------------------------------------------------------------------------
export async function generalChat(question, chatHistory = []) {
  const messages = [
    {
      role: "system",
      content: `You are Parker AI, a friendly and helpful study assistant.
Right now the user has not uploaded any document, so just have a natural,
warm conversation. Answer general questions, greetings, and casual chat
like a helpful study buddy. Keep replies concise and friendly.
If the user asks something that would be better answered from their study
material, you may mention they can upload a PDF and you'll answer from it.`,
    },
    ...chatHistory.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    max_tokens: 1024,
  });

  return completion.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Document Q&A that can also handle casual conversation naturally, while
// keeping strict grounding for factual document questions.
// ---------------------------------------------------------------------------
export async function answerQuestion(fileName, question, chatHistory = []) {
  if (!documentStores.has(fileName)) {
    throw new Error("Document not found. Please upload the PDF again.");
  }
const store = documentStores.get(fileName);

  // For small documents, give the model the ENTIRE document — keyword search
  // is only needed for large documents that can't fit in the context window.
  // This avoids retrieval misses where the right chunk isn't selected.
  let context;
  if (store.fullText && store.fullText.length < 20000) {
    context = store.fullText;
  } else {
    const relevantChunks = searchChunks(store.chunks, question);
    context = relevantChunks.join("\n\n---\n\n");
  }
  const messages = [
    {
      role: "system",
      content: `You are Parker AI, a friendly and helpful study assistant chatting
with a user about their uploaded document.

How to behave:
- If the user's message is casual conversation (greetings, thanks, jokes,
  "how are you", small talk, or follow-up chat), respond naturally and warmly
  like a friendly study buddy. You do NOT need the document for these.
- If the user asks a factual question about their study material, answer it
  based ONLY on the document context below. If the answer is not in the
  context, say "I couldn't find that in your document." Never invent
  document content.
- Maintain the flow of conversation — remember what was discussed recently.
- Be clear, concise, and friendly. Format answers nicely when listing points.
- Some pages were transcribed visually and some from plain text extraction,
  so formatting quality may vary slightly between pages — treat all of it as
  genuine document content either way.

Document context:
${context}`,
    },
    ...chatHistory.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: question },
  ];

const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    // This is a reasoning model — its internal "thinking" consumes tokens
    // from this budget before any visible answer is produced. Too small a
    // budget = it thinks and never answers (empty reply).
    max_tokens: 3000,
  });

  const reply = completion.choices[0]?.message?.content;
  console.log("[answerQuestion] reply length:", reply ? reply.length : 0);

  if (!reply || reply.trim().length === 0) {
    return "I ran out of room while working through that question. Please try asking again, or break the question into smaller parts.";
  }

  return reply;
}

// Get all uploaded documents
export function getDocuments() {
  return Array.from(documentStores.keys());
}

// Delete a document
export function deleteDocument(fileName) {
  documentStores.delete(fileName);
}