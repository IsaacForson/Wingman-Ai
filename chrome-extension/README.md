# Wingman AI - Chrome Extension

An AI-powered interview and exam assistant that runs invisibly in your browser.

## Features

- **📸 Screen Capture**: Captures and analyzes page content for questions
- **🎤 Audio Listening**: Detects questions from speech using Web Speech API
- **🤖 AI Analysis**: Identifies MCQs, coding challenges, and exam questions
- **💡 Smart Answers**: Generates solutions using your configured AI provider
- **👻 Invisible to Screen Share**: Extension popup is NOT captured in screen recordings

## Installation

### Development Mode

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### Icons (Required)

Before loading, create PNG icons in the `icons` folder:
- `icon16.png` (16x16)
- `icon32.png` (32x32)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can use any icon generator or create simple colored squares.

## Usage

### Keyboard Shortcuts

- **Cmd+Shift+W** (Mac) / **Ctrl+Shift+W** (Windows): Open extension popup
- **Cmd+Shift+S** / **Ctrl+Shift+S**: Capture and analyze current page
- **Cmd+Shift+L** / **Ctrl+Shift+L**: Toggle audio listening

### Capturing Screen Content

1. Click the extension icon or press the shortcut
2. Click "Capture Screen"
3. The extension reads the page content (no OCR needed - direct DOM access!)
4. AI analyzes for questions and generates answers

### Audio Listening

1. Click "Listen" to start speech recognition
2. Speak or let the meeting audio play
3. Questions are automatically detected
4. Click "Stop" when done

## Backend Connection

The extension connects to the Wingman AI Python backend at `http://localhost:8765`.

Make sure the backend is running:
```bash
cd backend
python main.py
```

## Privacy & Screen Share Safety

- **Extension popup is NOT visible in screen share**
- The popup renders in a separate Chrome context
- Only you can see the answers
- No overlay is added to the page itself

## Supported Platforms

Works great with:
- Google Meet
- Zoom (web version)
- Microsoft Teams (web)
- LeetCode
- HackerRank
- CodeSignal
- Any web-based exam or interview platform

## Troubleshooting

### Extension not capturing content
- Make sure you're on a regular web page (not chrome:// pages)
- Refresh the page after installing the extension

### Speech recognition not working
- Allow microphone permission when prompted
- Make sure you're on an HTTPS page (required for Web Speech API)

### Backend not connecting
- Verify backend is running on port 8765
- Check browser console for WebSocket errors

## Files Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── src/
│   ├── background/        # Service worker
│   │   └── background.js
│   ├── content/           # Injected scripts
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/             # Main UI (hidden from screen share)
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── sidepanel/         # Alternative side panel view
│       └── sidepanel.html
└── icons/                 # Extension icons
```

