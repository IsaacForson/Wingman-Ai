# 🚀 Wingman AI

**Your AI co-pilot for interviews, exams, meetings, and deep work.**

Wingman AI is a desktop application that provides real-time AI assistance by listening to conversations, analyzing screen content, and generating intelligent responses.

## ✨ Features

- **Dynamic Island UI** - Beautiful, non-intrusive interface
- **Real-time Transcription** - Live speech-to-text
- **AI-Powered Answers** - Multiple AI providers (Groq, Gemini, OpenAI, Claude, Ollama)
- **Screen Analysis** - OCR and code detection
- **Multiple Modes** - Interview, Study, Work, Meeting, Research
- **Practice Mode** - Mock interviews with STAR method coaching
- **Meeting Intelligence** - Speaker tracking, action items, summaries
- **Wellness Features** - Pomodoro timer, breathing exercises, break reminders
- **Screen-Share Safe** - Invisible to video calls

## 🛠️ Tech Stack

- **Frontend**: Electron + React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python + FastAPI + Socket.io
- **AI**: OpenAI, Anthropic, Groq, Google Gemini, Ollama, Hugging Face

## 📋 Prerequisites

- **Node.js** 18+ 
- **Python** 3.9+
- **macOS** 12+ (for full features)

### macOS Dependencies

```bash
# Install Tesseract for OCR
brew install tesseract

# Install PortAudio for audio capture
brew install portaudio
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd Wingman-Ai

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
```

### 2. Configure API Keys

Create a `.env` file in the `backend/` directory:

```env
# Free AI Providers (recommended to start)
GROQ_API_KEY=your_groq_key
GOOGLE_API_KEY=your_gemini_key

# Default provider
AI_PROVIDER=groq
```

Get free API keys:
- **Groq** (fastest): https://console.groq.com
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **Hugging Face**: https://huggingface.co/settings/tokens

### 3. Run Development Mode

```bash
# From project root
./scripts/dev.sh
```

Or manually:

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2: Frontend
cd frontend
npm run electron:dev
```

## 📦 Building for Distribution

### Build macOS DMG

```bash
# Make the build script executable
chmod +x scripts/build-mac.sh

# Build the DMG
./scripts/build-mac.sh
```

The DMG file will be in `frontend/release/`.

### Manual Build

```bash
cd frontend
npm run build:mac
```

## 🎮 Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Space` | Command Palette |
| `Cmd+,` | Settings |
| `Cmd+H` | History |
| `Cmd+Shift+P` | Pause/Resume |
| `Esc` | Minimize/Close |

### Operating Modes

- **Interview** - Optimized for job interviews
- **Study** - Detailed explanations with examples
- **Work** - Concise, actionable answers
- **Meeting** - Speaker tracking and summaries
- **Research** - Academic, thorough responses

## 🔒 Privacy & Security

- **Local Processing** - Use Ollama for 100% offline operation
- **Screen-Share Safe** - Hidden from screen capture
- **No Cloud Storage** - All data stays on your device
- **Encrypted Sessions** - Optional session encryption

## 📁 Project Structure

```
Wingman-Ai/
├── backend/           # Python FastAPI backend
│   ├── core/          # Core engine & websocket
│   ├── modules/       # Feature modules
│   │   ├── ai/        # AI processing
│   │   ├── audio/     # Audio capture & transcription
│   │   ├── screen/    # Screen capture & OCR
│   │   └── ...
│   └── main.py        # Entry point
│
├── frontend/          # Electron + React frontend
│   ├── src/
│   │   ├── main/      # Electron main process
│   │   ├── renderer/  # React app
│   │   └── preload/   # Preload scripts
│   └── package.json
│
└── scripts/           # Build & dev scripts
```

## 🐛 Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (need 3.9+)
- Ensure venv is activated: `source venv/bin/activate`
- Check port 8765 is free: `lsof -i :8765`

### No audio capture
- Grant microphone permission in System Preferences
- Check audio device: `python -c "import sounddevice; print(sounddevice.query_devices())"`

### OCR not working
- Install Tesseract: `brew install tesseract`
- Check installation: `tesseract --version`

### Screen capture permission
On macOS, grant Screen Recording permission:
1. System Preferences → Security & Privacy → Privacy
2. Select "Screen Recording"
3. Add Wingman AI

## 📄 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

---

**Built with ❤️ for productive people**
