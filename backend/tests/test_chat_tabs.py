"""Each chat tab keeps its own history and uses its own AI."""
import asyncio

import modules.conversation as conversation
from core.engine import WingmanEngine
from core.event_bus import event_bus, EventType
from modules.conversation.conversation_manager import ConversationManager


class FakeAI:
    def __init__(self):
        self.calls = []

    async def generate_answer_stream(self, question, context, mode, conversation_history, image=None, provider=None, model=None):
        self.calls.append({"q": question, "provider": provider, "model": model, "mode": mode,
                           "history": [m["content"] for m in conversation_history]})
        yield f"answer to {question}"

    def get_last_used_provider_info(self):
        return self.calls[-1]["provider"], self.calls[-1]["model"]


def test_tabs_are_isolated(tmp_path, monkeypatch):
    manager = ConversationManager(storage_path=str(tmp_path / "c.json"))
    monkeypatch.setattr(conversation, "get_conversation_manager", lambda: manager)
    engine = WingmanEngine()
    engine._ai_module = fake = FakeAI()
    completed = []

    async def on_complete(event):
        completed.append(event.data["conversation_id"])
    event_bus.subscribe(EventType.ANSWER_COMPLETE, on_complete)

    a = manager.create_conversation("interview", "groq", "openai/gpt-oss-20b")
    b = manager.create_conversation("study", "nvidia", None)

    async def run():
        await engine._generate_answer("A1", "manual", a.id)
        await engine._generate_answer("B1", "manual", b.id)
        await engine._generate_answer("A2", "manual", a.id)
        manager.set_active_conversation(b.id)
        await engine._generate_answer("voice question", "audio")  # no tab given -> the open tab
    asyncio.run(run())

    a1, b1, a2, voice = fake.calls
    assert (a1["provider"], a1["model"], a1["mode"]) == ("groq", "openai/gpt-oss-20b", "interview")
    assert (b1["provider"], b1["mode"]) == ("nvidia", "study")
    assert a2["history"] == ["A1", "answer to A1"]  # nothing from tab B leaks in
    assert voice["history"] == ["B1", "answer to B1"] and voice["provider"] == "nvidia"
    assert completed[-4:] == [a.id, b.id, a.id, b.id]


def test_captured_page_shows_short_text_but_ai_gets_page(tmp_path, monkeypatch):
    manager = ConversationManager(storage_path=str(tmp_path / "c.json"))
    monkeypatch.setattr(conversation, "get_conversation_manager", lambda: manager)
    engine = WingmanEngine()
    engine._ai_module = fake = FakeAI()
    conv = manager.create_conversation()
    asyncio.run(engine._generate_answer("📄 short", "extension_capture", conv.id, prompt="FULL PAGE TEXT"))
    assert fake.calls[0]["q"] == "FULL PAGE TEXT"
    first = conv.messages[0]
    assert (first.content, first.display) == ("FULL PAGE TEXT", "📄 short")
