# Talk PSX

**🔗 Live: [https://talk-psx.vercel.app/](https://talk-psx.vercel.app/)**

**Your AI-powered companion for Pakistan's stock market.** Ask questions in plain English and get real-time insights, company financials, and trend analysis for PSX-listed companies.

---

## What It Does

Talk PSX is a conversational AI that knows the Pakistan Stock Exchange inside out. Ask it anything:

- *"What are the best-performing sectors this week?"*
- *"Give me a financial overview of OGDC."*
- *"Which KSE-100 companies have the highest free float?"*

It retrieves relevant context from a live vector store of PSX company data and generates grounded, accurate answers using a local (Ollama) or cloud (Groq) LLM.

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
- **LangChain + LangGraph** for the RAG (Retrieve → Generate) pipeline, with streaming token-by-token responses
- **Pluggable chat model** (`src/lib/chatProvider.ts`), switchable via `CHAT_PROVIDER`:
  - **Ollama** (default) — local inference, no API keys needed
  - **Groq** — cloud inference via `@langchain/groq` for fast, hosted LLM calls (e.g. `llama-3.1-8b-instant`)
  - **Jina AI** — hosted embeddings API
- **PGVector** (Supabase) for semantic vector search over company embeddings
- Responses are rendered as **Markdown** on the frontend (`react-markdown`)

### Data Pipeline (`/data-pipeline`)
- **Python + uv** — fetches PSX company symbols, financials, and descriptions from the PSX API
- **DistilBART** (HuggingFace) to summarize raw company profiles
- **ingest.py** — chunks, embeds, and loads everything into PGVector
- **GitHub Actions cron** (`.github/workflows/ingest.yml`) — runs `ingest.py` automatically once a day (12:00 UTC, after PSX market close) to keep the vector store fresh, via `uv run python ingest.py`. Can also be triggered manually from the Actions tab (`workflow_dispatch`). Requires `DATABASE_URL` and `JINA_API_KEY` set as repo secrets (Settings → Secrets and variables → Actions)

### Live Quotes
- Real-time prices are fetched directly from **Yahoo Finance** (`src/lib/quoteService.ts`) — no API key or separate server required
- `src/lib/liveQuoteDetect.ts` detects price-related questions naming a KSE-100 symbol and injects the live quote into the RAG context, taking priority over stored data

### Evaluation (`/evaluation`)
- **RAGAS** framework measuring LLM Context Recall, Faithfulness, and Factual Correctness
- Runs against a synthetic test set generated from the real data corpus

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+ with [uv](https://github.com/astral-sh/uv)
- Either [Ollama](https://ollama.com) running locally with your chosen chat + embedding models, **or** a [Groq](https://console.groq.com) API key (and/or a Jina/HuggingFace API key for hosted embeddings)
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

# Ollama (default provider — local inference)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=your_preferred_model        # e.g. llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:latest

# Chat provider — "ollama" (default) or "groq"
CHAT_PROVIDER=ollama
GROQ_API_KEY=your_groq_api_key                # required if CHAT_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant               # optional, this is the default

# Embedding provider — "ollama" (default), "jina", or "huggingface"
EMBEDDING_PROVIDER=ollama
JINA_API_KEY=your_jina_api_key                # required if EMBEDDING_PROVIDER=jina
JINA_EMBEDDING_MODEL=jina-embeddings-v2-base-en
HUGGINGFACE_API_KEY=your_huggingface_api_key  # required if EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### 3. Ingest PSX data

Fetch company data from the PSX API and load it into PGVector:

```bash
npm run ingest
```

### 4. Start the dev server

```bash
npm run dev
```

Live quotes are fetched directly from Yahoo Finance at request time, so no separate quote server is needed.

Open [http://localhost:3000](http://localhost:3000) and start asking questions.

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
