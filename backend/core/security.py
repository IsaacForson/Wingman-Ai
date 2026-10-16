"""
Wingman AI - Local request guard
Only the Wingman desktop app and the Chrome extension may talk to the backend.
Blocks other websites open in your browser (they can reach localhost too),
including DNS-rebinding tricks that point their own domain at 127.0.0.1.
"""

from loguru import logger

# The Electron app stamps this Origin on every request it sends to the backend (see frontend/src/main/main.ts)
APP_ORIGIN = "wingman-app://desktop"


def is_allowed(host: str, origin: str, fetch_site: str, allowed_hosts: set[str]) -> bool:
    if host not in allowed_hosts:
        return False  # DNS rebinding: some website's domain pointed at 127.0.0.1
    if origin:
        return origin == APP_ORIGIN or origin.startswith("chrome-extension://")
    # No Origin: local tools (curl, the Electron main process) are fine, but a website's
    # <img>/<script> tag also sends none, and the browser marks those cross-site
    return fetch_site != "cross-site"


class LocalOriginGuard:
    """ASGI middleware covering HTTP, socket.io and plain websockets alike"""

    def __init__(self, app, port: int):
        self.app = app
        self.allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)

        headers = {k.decode("latin-1"): v.decode("latin-1") for k, v in scope["headers"]}
        host = headers.get("host", "")
        origin = headers.get("origin", "")

        # CORS preflights carry no data and change nothing; the real request after them is checked
        if scope["type"] == "http" and scope["method"] == "OPTIONS" and host in self.allowed_hosts:
            return await self.app(scope, receive, send)

        if is_allowed(host, origin, headers.get("sec-fetch-site", ""), self.allowed_hosts):
            return await self.app(scope, receive, send)

        logger.warning(f"🚫 Blocked {scope['type']} {scope.get('path')} from origin={origin or '-'} host={host}")
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return
        await send({"type": "http.response.start", "status": 403, "headers": [(b"content-type", b"text/plain")]})
        await send({"type": "http.response.body", "body": b"Forbidden"})
