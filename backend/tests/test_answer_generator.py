"""Groq -> NVIDIA fallback and NVIDIA key rotation (no network)."""
import asyncio

from config import settings
from modules.ai.answer_generator import AnswerGenerator, PROVIDER_URLS


def run(gen):
    async def collect():
        return "".join([c async for c in gen.generate_stream("q")])
    return asyncio.run(collect())


def make(monkeypatch, bad_keys):
    monkeypatch.setattr(settings, "groq_api_key", "groq")
    monkeypatch.setattr(settings, "nvidia_api_keys", "n1,n2,n3")
    calls = []

    async def fake(self, url, key, model, messages):
        calls.append(key)
        if key in bad_keys:
            raise Exception("HTTP 429")
        yield f"{key}:ok"

    monkeypatch.setattr(AnswerGenerator, "_stream_openai_compatible", fake)
    gen = AnswerGenerator(provider="groq")
    return gen, calls


def test_groq_first(monkeypatch):
    gen, calls = make(monkeypatch, set())
    assert run(gen) == "groq:ok" and calls == ["groq"]


def test_falls_back_and_rotates_keys(monkeypatch):
    gen, calls = make(monkeypatch, {"groq", "n1", "n2"})
    assert run(gen) == "n3:ok"
    assert calls == ["groq", "n1", "n2", "n3"]
    assert gen.last_used_provider == "nvidia"
    # Next request starts from the key that worked
    calls.clear()
    assert run(gen) == "n3:ok" and calls == ["groq", "n3"]


def test_all_down(monkeypatch):
    gen, _ = make(monkeypatch, {"groq", "n1", "n2", "n3"})
    assert run(gen).startswith("Error:")


def test_stale_model_name_uses_default(monkeypatch):
    seen = []
    monkeypatch.setattr(settings, "groq_api_key", "groq")

    async def fake(self, url, key, model, messages):
        seen.append(model)
        yield "x"

    monkeypatch.setattr(AnswerGenerator, "_stream_openai_compatible", fake)
    run(AnswerGenerator(provider="groq", default_model="llama-3.3-70b-versatile"))
    assert seen == ["openai/gpt-oss-120b"]
