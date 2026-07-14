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

// ---------------------------------------------------------------------------
// Convert common LaTeX math notation into plain readable text. The model
// tends to write LaTeX no matter what the prompt says, and users see it as
// unreadable raw code (\lfloor \frac{...} etc). This cleans replies before
// they reach the UI.
// ---------------------------------------------------------------------------
function makeMathReadable(text) {
  if (!text) return text;

  let t = text;

  // FIRST: flatten things that nest inside other commands, so \frac can match.
  // \text{...} and \mathrm{...} -> just the inner text
  t = t.replace(/\\text\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\mathrm\{([^{}]*)\}/g, "$1");
  // subscripts: d_{min} -> d_min
  t = t.replace(/([A-Za-z])_\{([^{}]+)\}/g, "$1_$2");

  // \frac{a}{b}  ->  (a / b)  — run twice to catch fractions that only became
  // simple after the inner braces above were flattened.
  t = t.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");
  t = t.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");
  
  // floor brackets -> floor(...)
  t = t.replace(/\\[Bb]ig\\lfloor/g, "floor(");
  t = t.replace(/\\[Bb]ig\\rfloor/g, ")");
  t = t.replace(/\\left\\lfloor/g, "floor(");
  t = t.replace(/\\right\\rfloor/g, ")");
  t = t.replace(/\\lfloor/g, "floor(");
  t = t.replace(/\\rfloor/g, ")");

  // \text{...} and \mathrm{...} -> just the inner text
  t = t.replace(/\\text\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\mathrm\{([^{}]*)\}/g, "$1");

  // subscripts: d_{min} -> d_min
  t = t.replace(/([A-Za-z])_\{([^{}]+)\}/g, "$1_$2");

  // common symbols
  t = t.replace(/\\times/g, "x");
  t = t.replace(/\\cdot/g, "*");
  t = t.replace(/\\le(?![a-z])/g, "<=");
  t = t.replace(/\\ge(?![a-z])/g, ">=");
  t = t.replace(/\\ne(?![a-z])/g, "!=");

  // strip leftover display-math delimiters \[ \] \( \) and sizing commands
  t = t.replace(/\\\[|\\\]|\\\(|\\\)/g, "");
  t = t.replace(/\\[Bb]ig[glr]?/g, "");
  t = t.replace(/\\left|\\right/g, "");

  return t;
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
Write all math in plain readable text (e.g. "t = floor((d_min - 1)/2) = 1").
NEVER use LaTeX notation like \\[ \\frac or \\lfloor — users see it as
unreadable raw code.
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

  return makeMathReadable(completion.choices[0].message.content);
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
- Write all math in plain readable text (e.g. "t = floor((d_min - 1)/2) = 1"). 
NEVER use LaTeX notation like \\[ \\frac or \\lfloor — users see it as unreadable raw code.
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
    model: "openai/gpt-oss-120b",
    messages,
    max_tokens: 3000,
  });

  const reply = makeMathReadable(completion.choices[0]?.message?.content);
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