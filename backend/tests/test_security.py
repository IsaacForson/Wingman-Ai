"""Only the Wingman app and Chrome extensions may reach the backend."""
import pytest
from fastapi import FastAPI, WebSocket
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from core.security import LocalOriginGuard, APP_ORIGIN

app = FastAPI()


@app.get("/api/conversations")
def conversations():
    return {"secret": "history"}


@app.websocket("/ws")
async def ws(socket: WebSocket):
    await socket.accept()
    await socket.send_text("hi")


app.add_middleware(LocalOriginGuard, port=8765)
client = TestClient(app, base_url="http://localhost:8765")


@pytest.mark.parametrize("headers", [
    {"origin": APP_ORIGIN},
    {"origin": "chrome-extension://abcdefghijklmnop"},
    {},  # curl / Electron main process health check
    {"sec-fetch-site": "none"},
])
def test_allowed(headers):
    assert client.get("/api/conversations", headers=headers).status_code == 200


@pytest.mark.parametrize("headers", [
    {"origin": "https://evil.example"},
    {"origin": "null"},  # sandboxed iframe on a website
    {"origin": "http://localhost:5173"},
    {"sec-fetch-site": "cross-site"},  # <img src=...> from a website
    {"origin": APP_ORIGIN, "host": "evil.example:8765"},  # DNS rebinding
])
def test_blocked(headers):
    assert client.get("/api/conversations", headers=headers).status_code == 403


def test_preflight_passes_but_real_request_is_checked():
    assert client.options("/api/conversations", headers={"origin": "null"}).status_code != 403
    assert client.get("/api/conversations", headers={"origin": "null"}).status_code == 403


def test_websocket():
    with client.websocket_connect("ws://localhost:8765/ws", headers={"origin": "chrome-extension://abc"}) as s:
        assert s.receive_text() == "hi"
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("ws://localhost:8765/ws", headers={"origin": "https://evil.example"}) as s:
            s.receive_text()
