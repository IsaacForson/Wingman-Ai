## What's in this PR

**AI providers**
- Groq is the only main provider; Gemini/Mistral/Claude removed.
- NVIDIA is the automatic backup when Groq is busy or not responding, rotating through `NVIDIA_API_KEYS` (comma-separated in `backend/.env`) until one answers; it sticks with the last key that worked.
- Retired model names replaced (`openai/gpt-oss-120b`, `nvidia/nemotron-3-super-120b-a12b`); stale saved model names fall back to the default.

**Asking questions**
- Type questions in the island (Enter sends, Shift+Enter for a new line).
- **Capture** button (and on the compact island): the Chrome extension reads the active tab, or only the highlighted text, over a new `/ws/extension` socket.
- **Screenshot** button / ⌘⇧X: the screen under the mouse goes to a vision model (Groq `qwen/qwen3.8-27b`, NVIDIA `nemotron-3-nano-omni` backup). Capture falls back to this when the extension isn't connected.
- **Listen to** computer audio (ScreenCaptureKit) so the interviewer on Zoom/Meet is heard; with "Both", only the interviewer's questions get answered.
- **Profile** tab: résumé + job description (paste or import PDF/text), used as context in Interview/Practice mode.

**Settings**
- Wired up: mic device, noise filter, silence wait, Whisper, streaming, sound/notifications, accent color, island position, opacity, compact mode, editable global hotkeys, history saving, clear data.
- Removed options that had nothing behind them (theme, minimize to tray, analytics, OCR options).
- Saved settings from the old version are migrated.

**Fixes**
- Security: the local backend only accepts the desktop app (Electron stamps its Origin) and Chrome extensions; other websites and DNS-rebinding are refused (403), including websockets.
- Opened from the DMG, the backend crashed (read-only bundle); it now runs from the user-data folder. The app offers to move itself to /Applications.
- Every event reached the app twice (main.py loads twice → two forwarders), doubling streamed answer text.
- App restarts its backend if it dies; socket retries forever. Audio loop no longer blocks the backend.

## Testing
- `backend/tests`: 16 pass (provider fallback + key rotation, vision fallback, origin guard).
- Built with the unchanged `./build.sh`; in the installed app verified: Groq + NVIDIA answers, typed questions, extension capture, screenshot → vision answer, résumé context, PDF/text import, window settings and hotkey rebinding.
- **Not verified:** real screen/system-audio capture with permission granted (the test environment has no Screen Recording permission), and whether macOS honours "hide from screen capture".

## Notes
- After installing, reload the Chrome extension once (new `alarms` permission).
- Builds are unsigned, so macOS treats each rebuild as a new app: re-add Wingman AI under Screen & System Audio Recording after updating.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
