// lib/rag.js
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory storage
const documentStores = new Map();

// ---------------------------------------------------------------------------
// Layout-aware PDF text extraction using pdfjs-dist (unchanged).
// ---------------------------------------------------------------------------
async function extractTextWithLayout(fileBuffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

  const data = new Uint8Array(fileBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  let fullText = "";

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const lines = new Map();

    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push({ x, str: item.str });
    }

    const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = lines.get(y).sort((a, b) => a.x - b.x);

      let lineText = "";
      let prevEndX = null;
      for (const it of items) {
        if (prevEndX !== null) {
          const gap = it.x - prevEndX;
          if (gap > 15) {
            const spaces = Math.min(8, Math.max(2, Math.round(gap / 6)));
            lineText += " ".repeat(spaces);
          } else {
            lineText += " ";
          }
        }
        lineText += it.str;
        prevEndX = it.x + it.str.length * 5;
      }
      fullText += lineText + "\n";
    }

    fullText += "\n";
  }

  return { text: fullText, numPages };
}

// Split text into chunks (unchanged)
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

// Simple keyword search (unchanged)
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
    const { text, numPages } = await extractTextWithLayout(fileBuffer);

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
// NEW: General chit-chat when no document is loaded.
// Pure conversation mode — friendly, natural, remembers recent messages.
// Gently reminds the user it can also analyze PDFs when relevant.
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
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: 1024,
  });

  return completion.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// UPDATED: Document Q&A that can also handle casual conversation naturally,
// while keeping strict grounding for factual document questions.
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
- Some context may contain tables represented as spaced text — do your best
  to read them.

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
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: 1024,
  });

  return completion.choices[0].message.content;
}

// Get all uploaded documents (unchanged)
export function getDocuments() {
  return Array.from(documentStores.keys());
}

// Delete a document (unchanged)
export function deleteDocument(fileName) {
  documentStores.delete(fileName);
}