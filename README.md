# Aurora — AI Chatbot 💬

A modern, ChatGPT-style chatbot for casual conversations, built with **Next.js 14 (App Router)**, **React**, and **Tailwind CSS**. It is beginner-friendly to read and production-ready to deploy.

![stack](https://img.shields.io/badge/Next.js-14-black) ![react](https://img.shields.io/badge/React-18-blue) ![tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## ✨ Features

- ChatGPT-style two-column layout (sidebar + chat)
- User messages on the **right**, AI messages on the **left**, rounded bubbles
- **Auto-scroll** to newest message + **timestamps**
- Sidebar: **New chat**, **chat history**, **user profile**
- **Typing indicator** ("AI is typing…") and **loading animation**
- **Dark / light** mode toggle (remembered across reloads)
- **Clear chat** and **copy message** buttons
- **Enter** to send, **Shift+Enter** for a newline
- Real **LLM connection** through a secure server route
- History saved to the browser via **localStorage**
- Fully **responsive** (mobile drawer sidebar) and respects reduced-motion

---

## 📁 Folder structure

```
aurora-chatbot/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.js      # SERVER endpoint: holds the API key, calls the LLM
│   ├── globals.css           # Tailwind + global styles
│   ├── layout.js             # Root layout, fonts, no-flash theme script
│   └── page.js               # Home page → renders <ChatApp/>
├── components/
│   ├── ChatApp.js            # Top-level: wires hooks to UI
│   ├── Sidebar.js            # New chat, history, profile (mobile drawer)
│   ├── ChatWindow.js         # Header + message list + auto-scroll
│   ├── MessageBubble.js      # One message (avatar, bubble, copy, time)
│   ├── TypingIndicator.js    # The bouncing-dots "AI is typing…" bubble
│   ├── Composer.js           # Input box (auto-grow, Enter-to-send)
│   └── ThemeToggle.js        # Sun/Moon toggle button
├── hooks/
│   ├── useChats.js           # All chat state, persistence, send logic
│   └── useTheme.js           # Dark/light mode logic
├── lib/
│   └── utils.js              # Small helpers (ids, time, new chat)
├── .env.local.example        # Copy to .env.local and add your key
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.mjs
└── jsconfig.json             # Enables the "@/..." import alias
```

---

## 🚀 Setup (5 minutes)

You need **Node.js 18.17+** installed.

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.local.example .env.local
#   then open .env.local and paste your real key:
#   ANTHROPIC_API_KEY=sk-ant-...

# 3. Run the dev server
npm run dev
```

Open **http://localhost:3000**. Type a message and press Enter.

> Get an Anthropic key at https://console.anthropic.com. Prefer OpenAI? See the comment block at the bottom of `app/api/chat/route.js` — it's a 5-line swap.

---

## 🧠 How it works

### How the frontend works
The UI is split into small, reusable components. `ChatApp` is the conductor: it pulls **state and logic** from two custom hooks (`useChats`, `useTheme`) and passes them down as props to **presentational** components (`Sidebar`, `ChatWindow`, `MessageBubble`, `Composer`, …). Keeping logic in hooks and visuals in components makes each file short and easy to follow. Tailwind utility classes handle all styling, and the `dark` class on `<html>` switches the whole theme at once.

### How messages are sent to the LLM
1. You type in `Composer` and hit Enter → it calls `sendMessage(text)` in `useChats`.
2. The hook adds your message to the active chat (so it appears instantly), shows the typing indicator, and builds the conversation as `[{ role, content }, …]`.
3. It `POST`s that array to **`/api/chat`** — our own server route, not the LLM directly.
4. `app/api/chat/route.js` runs **on the server**, attaches the secret `ANTHROPIC_API_KEY`, and forwards the request to the LLM. The key never reaches the browser.
5. The route returns `{ reply }`; the hook appends it as an assistant message and the UI re-renders.

This server-proxy pattern is the important security detail: **API keys must never live in client-side code.**

### How chat history is stored
History lives in React state and is mirrored to the browser's **`localStorage`** under the key `aurora.chats`. `useChats` loads it once on mount and saves on every change, so conversations survive refreshes. It's per-browser and needs no database — perfect for a personal app. To sync across devices, swap localStorage for a database (e.g. Postgres/Supabase) and add user auth; the hook is the only file you'd change.

---

## ☁️ Deployment

### Option A — Vercel (recommended, made by Next.js's creators)
1. Push this folder to a GitHub repository.
2. Go to https://vercel.com → **New Project** → import the repo.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY` with your key.
4. Click **Deploy**. You get a live HTTPS URL in ~1 minute.

### Option B — Any Node host (Render, Railway, a VPS)
```bash
npm run build   # create the production build
npm run start   # serve it (defaults to port 3000)
```
Make sure `ANTHROPIC_API_KEY` is set in the host's environment settings.

---

## 🔧 Customizing

- **Personality:** edit `SYSTEM_PROMPT` in `app/api/chat/route.js`.
- **Model:** change the `model` field in the same file.
- **Colors/brand:** the gradient `from-indigo-500 … to-fuchsia-500` and the name "Aurora" appear in `Sidebar.js` and `ChatWindow.js`.
- **Provider:** use the OpenAI snippet at the bottom of `route.js`.

---

## ⚠️ Notes
- `.env.local` is git-ignored — never commit your key.
- This is a learning-friendly base; for real users add auth, rate limiting, and server-side history.

Happy building! 🎉
