# 🚀 Wingman AI

> Your AI co-pilot for interviews, exams, meetings, and deep work. Always present, never in the way.

![Wingman AI](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

## ✨ Features

### Core Functionality
- 🎙️ **Real-time Audio Transcription** - Captures and transcribes conversations in real-time
- 🔍 **Question Detection** - Automatically detects questions from audio and screen
- 🤖 **AI-Powered Answers** - Generates contextual answers using GPT-4/Claude
- 📸 **Screen Analysis** - OCR and code detection from your screen
- 🏝️ **Dynamic Island UI** - Beautiful, unobtrusive interface that morphs based on state
- 🔒 **Screen-Share Safe** - Invisible to screen recording and sharing

### Multiple Modes
- **Interview Mode** - Technical and behavioral interview assistance
- **Study Mode** - Learning and exam preparation
- **Work Mode** - Productivity and coding help
- **Meeting Mode** - Real-time meeting intelligence
- **Research Mode** - Deep research assistance
- **Practice Mode** - Mock interview practice with feedback

## 🏗️ Architecture

```
wingman-ai/
├── backend/           # Python FastAPI backend
│   ├── core/          # Core engine and WebSocket server
│   ├── modules/       # Feature modules (audio, screen, AI, etc.)
│   └── utils/         # Utilities and helpers
│
├── frontend/          # Electron + React frontend
│   ├── src/main/      # Electron main process
│   ├── src/preload/   # Preload scripts
│   └── src/renderer/  # React application
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       ├── store/         # Zustand state management
│       └── services/      # API services
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Tesseract OCR (for screen text extraction)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your API keys

# Start the backend
python main.py
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development
npm run electron:dev
```

## ⚙️ Configuration

Create a `.env` file in the `backend/` directory:

```env
# AI Provider API Keys (at least one required)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-your-anthropic-key

# Optional: Voice output
ELEVENLABS_API_KEY=your-elevenlabs-key

# Model Settings
DEFAULT_MODEL=gpt-4-turbo-preview
WHISPER_MODEL=base
```

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Visibility | `Cmd/Ctrl + Shift + W` |
| Command Palette | `Cmd/Ctrl + Space` |
| Pause/Resume | `Cmd/Ctrl + Shift + P` |
| Capture Screen | `Cmd/Ctrl + Shift + S` |
| Emergency Hide | `Cmd/Ctrl + Shift + Escape` |

## 🎯 Dynamic Island States

1. **Nano** (60×40px) - Minimal pulsing indicator
2. **Mini** (140×44px) - Listening with waveform
3. **Normal** (420×64px) - Question preview and status
4. **Expanded** (600×400px) - Full answer display
5. **Fullscreen** (900×600px) - Complex content view

## 🔧 Tech Stack

### Backend
- **FastAPI** - Async web framework
- **Socket.IO** - Real-time WebSocket communication
- **Whisper** - Speech-to-text transcription
- **OpenAI/Anthropic** - LLM providers
- **mss** - Screen capture
- **Tesseract/EasyOCR** - Text extraction

### Frontend
- **Electron** - Desktop application framework
- **React 18** - UI library
- **Vite** - Build tool
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.IO Client** - WebSocket client

## 📊 Performance Targets

- Audio transcription latency: <1 second
- Question detection: <0.5 seconds
- AI response (streaming start): <0.5 seconds
- UI animations: 60fps
- Memory (idle): <300MB
- CPU (idle): <5%

## 🔒 Privacy & Security

- **Screen-share protection** - Window excluded from screen capture
- **Local processing option** - Run AI models locally
- **Encrypted storage** - AES-256 for sensitive data
- **No cloud storage by default** - All data stays local
- **API key encryption** - Stored securely in OS keychain

## 🗺️ Roadmap

### Phase 1 (MVP) ✅
- Real-time audio transcription
- Question detection
- AI answer generation
- Dynamic Island UI

### Phase 2 (In Progress)
- Knowledge base integration
- Multi-language support
- Meeting intelligence
- Voice output

### Phase 3 (Planned)
- Practice mode with feedback
- Analytics dashboard
- Session recording/replay
- Plugin system

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 and Whisper
- Anthropic for Claude
- The Electron and React communities

---

**Built with ❤️ for anyone who wants an AI co-pilot by their side.**

