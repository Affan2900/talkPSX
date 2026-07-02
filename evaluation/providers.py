"""
Shared LLM/embedding provider factory for evaluation scripts.

Supported providers: ollama, gemini, groq, openrouter
Each builder returns (LangchainLLMWrapper, LangchainEmbeddingsWrapper).

Usage:
    from providers import get_provider
    llm, embeddings = get_provider("openrouter")               # dataset generation
    llm, embeddings = get_provider("openrouter", eval_mode=True)  # evaluation judging

OpenRouter env vars:
    OPENROUTER_API_KEY        — required
    OPENROUTER_MODEL          — model for dataset generation (default: meta-llama/llama-3.3-70b-instruct)
    EVAL_OPENROUTER_MODEL     — model for evaluation judging  (default: openai/gpt-4o-mini)

Other env vars:
    GOOGLE_API_KEY            — Gemini
    GROQ_API_KEY / GROQ_API_KEYS — Groq (comma-separated for multi-key rotation)
    GROQ_CHAT_MODEL           — Groq model override
    GEMINI_CHAT_MODEL / GEMINI_EMBED_MODEL
    OLLAMA_BASE_URL / EVAL_LLM_MODEL / OLLAMA_CHAT_MODEL / OLLAMA_EMBEDDING_MODEL
    HF_EMBED_MODEL            — HuggingFace embedding model (used by groq + openrouter)
"""
import asyncio
import os
import sys

from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import PrivateAttr
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper

# httpx (used by the OpenAI SDK) fails on Windows with the default ProactorEventLoop.
# Setting the policy here covers every script that imports this module.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


# ── Internal model classes ─────────────────────────────────────────────────────

class _RequestsOpenRouter(BaseChatModel):
    """
    Calls OpenRouter using requests (sync) instead of the OpenAI SDK's async httpx.
    On Windows, httpx async transport raises APIConnectionError even though sync
    httpx works fine. Running the sync call in a thread executor lets Ragas await
    it without touching httpx's async stack.
    """

    model_name: str = ""
    api_key: str = ""
    max_tokens: int = 4096

    @property
    def _llm_type(self) -> str:
        return "openrouter-requests"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        import requests as _requests
        from langchain_core.messages import AIMessage
        from langchain_core.outputs import ChatGeneration, ChatResult

        role_map = {"human": "user", "ai": "assistant", "system": "system"}
        formatted = [
            {"role": role_map.get(m.type, "user"), "content": m.content}
            for m in messages
        ]
        resp = _requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={"model": self.model_name, "messages": formatted, "max_tokens": self.max_tokens},
            timeout=120,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, lambda: self._generate(messages, stop, run_manager, **kwargs)
        )


class _RotatingChatGroq(BaseChatModel):
    """Rotates through multiple Groq API keys on RateLimitError."""

    model_name: str = ""
    _clients: list = PrivateAttr()
    _idx: int = PrivateAttr(default=0)

    def __init__(self, api_keys: list[str], model: str, **kwargs):
        from langchain_groq import ChatGroq
        super().__init__(model_name=model, **kwargs)
        self._clients = [ChatGroq(model=model, api_key=k, temperature=0) for k in api_keys]

    @property
    def _llm_type(self) -> str:
        return "rotating-groq"

    def _next(self, start: int) -> int:
        nxt = (self._idx + 1) % len(self._clients)
        if nxt == start:
            raise RuntimeError("All Groq API keys have hit their rate limit.")
        print(f"\n  [groq] Rate limit on key {self._idx + 1}, rotating to key {nxt + 1}")
        return nxt

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        import groq as _groq
        start = self._idx
        while True:
            try:
                return self._clients[self._idx]._generate(messages, stop, run_manager, **kwargs)
            except _groq.RateLimitError:
                self._idx = self._next(start)

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        import groq as _groq
        start = self._idx
        while True:
            try:
                return await self._clients[self._idx]._agenerate(messages, stop, run_manager, **kwargs)
            except _groq.RateLimitError:
                self._idx = self._next(start)


# ── Provider builders ──────────────────────────────────────────────────────────

def build_ollama_provider() -> tuple[LangchainLLMWrapper, LangchainEmbeddingsWrapper]:
    from langchain_ollama import ChatOllama, OllamaEmbeddings
    base_url    = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    chat_model  = os.getenv("EVAL_LLM_MODEL", os.getenv("OLLAMA_CHAT_MODEL", "deepseek-r1:1.5b"))
    embed_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text:latest")
    print(f"  LLM:        Ollama / {chat_model}")
    print(f"  Embeddings: Ollama / {embed_model}")
    llm        = LangchainLLMWrapper(ChatOllama(model=chat_model, base_url=base_url))
    embeddings = LangchainEmbeddingsWrapper(OllamaEmbeddings(model=embed_model, base_url=base_url))
    return llm, embeddings


def build_gemini_provider() -> tuple[LangchainLLMWrapper, LangchainEmbeddingsWrapper]:
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GOOGLE_API_KEY is not set. Add it to .env.local.\n"
            "Get a free key at https://aistudio.google.com/apikey"
        )
    chat_model  = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash")
    embed_model = os.getenv("GEMINI_EMBED_MODEL", "models/text-embedding-004")
    print(f"  LLM:        Gemini / {chat_model}")
    print(f"  Embeddings: Gemini / {embed_model}")
    llm        = LangchainLLMWrapper(ChatGoogleGenerativeAI(model=chat_model, google_api_key=api_key))
    embeddings = LangchainEmbeddingsWrapper(
        GoogleGenerativeAIEmbeddings(model=embed_model, google_api_key=api_key)
    )
    return llm, embeddings


def _load_groq_keys() -> list[str]:
    multi = os.getenv("GROQ_API_KEYS", "")
    if multi:
        return [k.strip() for k in multi.split(",") if k.strip()]
    single = os.getenv("GROQ_API_KEY", "")
    return [single] if single else []


def build_groq_provider() -> tuple[LangchainLLMWrapper, LangchainEmbeddingsWrapper]:
    from langchain_huggingface import HuggingFaceEmbeddings
    api_keys = _load_groq_keys()
    if not api_keys:
        raise EnvironmentError(
            "No Groq API key found. Set GROQ_API_KEY or GROQ_API_KEYS in .env.local.\n"
            "Get free keys at https://console.groq.com/keys"
        )
    chat_model  = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
    embed_model = os.getenv("HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    print(f"  LLM:        Groq / {chat_model} ({len(api_keys)} key(s))")
    print(f"  Embeddings: HuggingFace / {embed_model}")
    if len(api_keys) > 1:
        client = _RotatingChatGroq(api_keys=api_keys, model=chat_model)
    else:
        from langchain_groq import ChatGroq
        client = ChatGroq(model=chat_model, api_key=api_keys[0], temperature=0)
    llm        = LangchainLLMWrapper(client)
    embeddings = LangchainEmbeddingsWrapper(HuggingFaceEmbeddings(model_name=embed_model))
    return llm, embeddings


def build_openrouter_provider(eval_mode: bool = False) -> tuple[LangchainLLMWrapper, LangchainEmbeddingsWrapper]:
    from langchain_huggingface import HuggingFaceEmbeddings
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENROUTER_API_KEY is not set. Add it to .env.local.\n"
            "Get a key at https://openrouter.ai/keys"
        )
    if eval_mode:
        # Smaller, cheaper model with strong JSON compliance for LLM-as-judge metrics
        model = os.getenv("EVAL_OPENROUTER_MODEL", "openai/gpt-4o-mini")
    else:
        model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
    embed_model = os.getenv("HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    print(f"  LLM:        OpenRouter / {model}")
    print(f"  Embeddings: HuggingFace / {embed_model}")
    llm        = LangchainLLMWrapper(_RequestsOpenRouter(model_name=model, api_key=api_key))
    embeddings = LangchainEmbeddingsWrapper(HuggingFaceEmbeddings(model_name=embed_model))
    return llm, embeddings


# ── Factory ────────────────────────────────────────────────────────────────────

def get_provider(
    name: str,
    eval_mode: bool = False,
) -> tuple[LangchainLLMWrapper, LangchainEmbeddingsWrapper]:
    """
    Return (llm, embeddings) for the given provider name.

    Args:
        name:      "ollama" | "gemini" | "groq" | "openrouter"
        eval_mode: only affects openrouter — selects EVAL_OPENROUTER_MODEL
                   (default: openai/gpt-4o-mini) instead of OPENROUTER_MODEL.
                   Use eval_mode=True in main.py, False in synthetic_dataset.py.
    """
    if name == "openrouter":
        return build_openrouter_provider(eval_mode=eval_mode)
    builders = {
        "ollama": build_ollama_provider,
        "gemini": build_gemini_provider,
        "groq":   build_groq_provider,
    }
    if name not in builders:
        valid = sorted(builders) + ["openrouter"]
        raise ValueError(f"Unknown provider '{name}'. Choose from: {valid}")
    return builders[name]()
