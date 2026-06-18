# ParkerBot — AI Insurance Chatbot

An AI-powered insurance chatbot built with Next.js, React, and Tailwind CSS, powered by Groq LLM (llama-3.3-70b-versatile).

## Features
- Multi-user support
- Policy management and renewal flows
- Chat history with SQLite
- Dark / light mode
- Real LLM connection through a secure server route

## Tech Stack
- Next.js 14
- React
- Tailwind CSS
- Groq LLM (llama-3.3-70b-versatile)
- SQLite

## Getting Started

1. Clone the repo
   git clone https://github.com/AyushkaShakya/parkerbot.git

2. Install dependencies
   npm install

3. Add your API key
   cp .env.local.example .env.local
   Then open .env.local and add your Groq API key

4. Setup database
   node setup-db.js

5. Run the app
   npm run dev

Open http://localhost:3000
