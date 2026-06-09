# Talk PSX

**Your AI-powered companion for Pakistan's stock market.** Ask questions in plain English and get real-time insights, company financials, and trend analysis for PSX-listed companies — no spreadsheets required.

---

## What It Does

Talk PSX is a conversational AI that knows the Pakistan Stock Exchange inside out. Ask it anything:

- *"What are the best-performing sectors this week?"*
- *"Give me a financial overview of OGDC."*
- *"Which KSE-100 companies have the highest free float?"*

It retrieves relevant context from a live vector store of PSX company data and generates grounded, accurate answers using a local LLM.

---

## Features

| Feature | Description |
|---|---|
| **Real-time Data** | Up-to-the-minute PSX prices, volume, and momentum |
| **Trend Analysis** | Sector moves and price patterns with AI summaries |
| **Company Financials** | Balance sheets, ratios, and filings for listed companies |
| **Instant Answers** | Plain-English Q&A |
| **Persistent Chats** | Sign in to save and continue research sessions |
---

## Tech Stack

### Frontend
- **Next.js 15** (Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS** + **Framer Motion** for smooth, animated UI
- **Clerk** for authentication
- **Drizzle ORM** + **Supabase (PostgreSQL)** for chat/user persistence

### AI Pipeline
- **LangChain + LangGraph** for the RAG (Retrieve → Generate) pipeline
- **Ollama** for local LLM inference (no API keys needed for the core model)
- **PGVector** (Supabase) for semantic vector search over company embeddings
- **nomic-embed-text** for embedding generation

### Data Pipeline (`/data-pipeline`)
- **Python + uv** — fetches PSX company symbols, financials, and descriptions from the PSX API
- **DistilBART** (HuggingFace) to summarize raw company profiles
- **ingest.py** — chunks, embeds, and loads everything into PGVector

### Live Quote API
- **FastAPI** server (`npm run quote-api`) — serves real-time stock price lookups to the Next.js backend

### Evaluation (`/evaluation`)
- **RAGAS** framework measuring LLM Context Recall, Faithfulness, and Factual Correctness
- Runs against a synthetic test set generated from the real data corpus

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+ with [uv](https://github.com/astral-sh/uv)
- [Ollama](https://ollama.com) running locally with your chosen chat + embedding models
- Supabase project with PGVector extension enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file at the project root:

```env
# Supabase
DATABASE_URL=your_supabase_postgres_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=your_preferred_model        # e.g. llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:latest
```

### 3. Ingest PSX data

Fetch company data from the PSX API and load it into PGVector:

```bash
npm run ingest
```

### 4. Start the dev server

```bash
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Live quote API (optional, for real-time prices)
npm run quote-api
```

Open [http://localhost:3000](http://localhost:3000) and start asking questions.

---

## Project Structure

```
talk-psx/
├── src/
│   ├── app/
│   │   ├── api/          # Next.js API routes (chat, user, eval, quotes)
│   │   ├── chat/         # Chat page ([chatId])
│   │   ├── components/   # UI components (Hero, ChatInterface, Sidebar, ...)
│   │   ├── db/           # Drizzle schema
│   │   └── page.tsx      # Landing page
│   └── lib/
│       ├── generate.ts         # LangGraph RAG pipeline
│       ├── createEmbeddings.ts # Startup embedding loader
│       ├── quoteService.ts     # Live quote lookups
│       └── ...
├── data-pipeline/        # Python pipeline — fetch, summarize, ingest
└── evaluation/           # RAGAS evaluation suite
```

---

## Evaluation

To measure how well the RAG pipeline performs:

```bash
cd evaluation

# 1. Generate a synthetic test set (run once)
uv run python synthetic_dataset.py

# 2. Run evaluation against a live dev server
uv run python main.py
```

Outputs `evaluation_results.csv` and `evaluation_summary.csv` with scores for Context Recall, Faithfulness, and Factual Correctness.

---

## License

MIT
