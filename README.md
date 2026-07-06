# Parker AI

A RAG-powered PDF study assistant. Upload a PDF, ask questions about it, and get answers grounded in your actual document — with natural conversational chat built in too.

> **Project history:** This project started as *ParkerBot*, an insurance chatbot, and was transformed into *Parker AI*, a document Q&A assistant, as part of an ongoing learning journey in full-stack development, RAG pipelines, and AI integration. Earlier commits in this repo reflect that original version.

---

## Features

- **Upload a PDF** and chat with its contents
- **Retrieval-Augmented Generation (RAG)** — answers are grounded in your document, not hallucinated
- **Natural conversation** — greetings, small talk, and follow-ups work even without a document loaded
- **Layout-aware text extraction** — preserves spacing/structure from the PDF for better readability of tables and structured content
- **Multiple documents** — upload, switch between, and delete PDFs from the sidebar
- **Warm, custom UI** — a cream/coffee-toned theme designed for comfortable reading

---

## How it works (RAG pipeline)

```
Upload PDF
  → pdfjs-dist extracts text (layout-aware, preserves spacing)
  → text is split into overlapping chunks
  → chunks stored in memory

User asks a question
  → keyword search scores chunks by relevance
  → top matching chunks are retrieved
  → chunks + question sent to Groq (Llama 3.3 70B) as context
  → model answers using ONLY that context (for factual questions)
  → casual conversation is handled naturally, without needing the document
```

If no document is uploaded, the assistant switches to a general conversation mode instead of refusing to talk.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| LLM | Groq API (`llama-3.3-70b-versatile`) |
| PDF Extraction | `pdfjs-dist` (layout-aware, position-based text extraction) |
| Retrieval | Custom keyword-based chunk search (in-memory) |
| Storage | In-memory (`Map`) — see Known Limitations below |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- A [Groq API key](https://console.groq.com) (free tier available)

### Setup

```bash
git clone https://github.com/AyushkaShakya/parkerbot.git
cd parkerbot
npm install --legacy-peer-deps
```

Create a `.env.local` file in the project root:

```
GROQ_API_KEY=your_groq_api_key_here
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
├── api/
│   ├── chat/route.js      # Chat endpoint — routes to chit-chat or RAG mode
│   └── upload/route.js    # PDF upload + processing endpoint
├── globals.css            # Theme (CSS variables for the color palette)
├── layout.js               # Root layout, fonts, page metadata
└── page.js                 # Renders the main app

components/
├── ChatApp.js              # Top-level state and logic
├── ChatWindow.js            # Message list, welcome screen, header
├── Composer.js               # Message input box
└── Sidebar.js                 # Upload button, document list, branding

lib/
├── rag.js                   # Core RAG pipeline: extraction, chunking, search, LLM calls
└── utils.js                 # Small helpers
```

---

## Known Limitations

- **Data is lost on server restart.** Uploaded PDFs are stored in memory only, not in a persistent database. Re-upload after restarting the dev server.
- **Tables with complex formatting may not extract cleanly.** Text extraction preserves general layout, but dense tables (especially with subscripts or unusual spacing) can still come through scrambled. A vision-model-based approach would be needed to fully solve this.
- **No support for scanned/handwritten PDFs.** Only PDFs with real embedded text are supported; there's no OCR step.
- **Retrieval is keyword-based, not semantic.** Chunk matching relies on shared words rather than meaning, so questions phrased very differently from the document's wording may retrieve weaker matches.

---

## Possible Next Steps

- [ ] Upgrade retrieval to embeddings/semantic search
- [ ] Replace in-memory storage with a persistent vector database
- [ ] Add source citations (show which chunk an answer came from)
- [ ] Deploy to Vercel
- [ ] Explore a vision-model approach for reading tables and scanned documents

---

## License

Personal / educational project.