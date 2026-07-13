// lib/rag.js
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory storage
const documentStores = globalThis.__parkerDocumentStores || new Map();
if (!globalThis.__parkerDocumentStores) {
  globalThis.__parkerDocumentStores = documentStores;
}

// ---------------------------------------------------------------------------
// PDF text extraction using pdf-parse.
// Switched back from pdfjs-dist because its worker file doesn't get bundled
// correctly in Vercel's serverless environment, causing uploads to fail in
// production. pdf-parse has no worker dependency, so it's reliable to deploy.
// Trade-off: plain text extraction, so complex tables may not read cleanly
// (documented as a known limitation).
// ---------------------------------------------------------------------------
async function extractText(fileBuffer) {
  let pdfParse;
  try {
    pdfParse = require("pdf-parse");
    if (typeof pdfParse !== "function") pdfParse = pdfParse.default;
  } catch (e) {
    throw new Error("pdf-parse module not found");
  }

  const pdfData = await pdfParse(fileBuffer);
  return { text: pdfData.text, numPages: pdfData.numpages };
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
    const { text, numPages } = await extractText(fileBuffer);

    if (!text || text.trim().length === 0) {
      throw new Error("Could not extract text from PDF");
    }

    const chunks = splitIntoChunks(text);

    documentStores.set(fileName, {
      chunks,
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
    model:"openai/gpt-oss-120b",
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
  const relevantChunks = searchChunks(store.chunks, question);
  const context = relevantChunks.join("\n\n---\n\n");

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
    model:"openai/gpt-oss-120b",
    messages,
    max_tokens: 3000,
  });

  const reply = completion.choices[0]?.message?.content;
  if (!reply || reply.trim().length === 0) {
    return "I ran out of room while working through that. Please try asking again.";
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