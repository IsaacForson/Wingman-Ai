#!/bin/bash

# Wingman AI - macOS Build Script
# This script builds the complete application as a DMG

set -e  # Exit on error

echo "🚀 Building Wingman AI for macOS..."
echo "========================================"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📁 Project root: $PROJECT_ROOT${NC}"

# Step 1: Check Python
echo ""
echo -e "${YELLOW}Step 1: Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python3 not found. Please install Python 3.9+${NC}"
    exit 1
fi

# Step 2: Check Node.js
echo ""
echo -e "${YELLOW}Step 2: Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Step 3: Install frontend dependencies
echo ""
echo -e "${YELLOW}Step 3: Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Step 4: Create requirements.txt for production (without dev dependencies)
echo ""
echo -e "${YELLOW}Step 4: Preparing backend for bundling...${NC}"
cd "$BACKEND_DIR"

# Create a clean requirements file (exclude local paths if any)
cat > requirements-prod.txt << 'EOF'
# Wingman AI - Production Dependencies
fastapi>=0.109.0
uvicorn>=0.27.0
python-socketio>=5.10.0
python-dotenv>=1.0.0
pydantic>=2.6.0
pydantic-settings>=2.1.0
loguru>=0.7.2

# Audio
sounddevice>=0.4.6
webrtcvad>=2.0.10
numpy>=1.26.0

# AI Providers
openai>=1.10.0
anthropic>=0.18.0
groq>=0.4.0
google-generativeai>=0.3.0
huggingface_hub>=0.20.0
ollama>=0.1.0

# Screen & OCR
mss>=9.0.1
pillow>=10.2.0
pytesseract>=0.3.10
opencv-python-headless>=4.9.0

# NLP & Embeddings
langchain>=0.1.0
langchain-community>=0.0.16
tiktoken>=0.5.2
chromadb>=0.4.22

# Utilities
httpx>=0.26.0
aiofiles>=23.2.1
pyperclip>=1.8.2
psutil>=5.9.8
EOF

echo -e "${GREEN}✓ Backend prepared${NC}"

# Step 5: Build the Electron app
echo ""
echo -e "${YELLOW}Step 5: Building Electron application...${NC}"
cd "$FRONTEND_DIR"

# Build for current architecture only (faster)
echo "Building for current architecture..."
npm run build:mac

echo -e "${GREEN}✓ Build complete!${NC}"

# Step 6: Show output location
echo ""
echo "========================================"
echo -e "${GREEN}🎉 Build successful!${NC}"
echo ""
echo "📦 Output files are in:"
echo "   $FRONTEND_DIR/release/"
echo ""
echo "Look for the .dmg file to install on your Mac."
echo ""
echo "========================================"

# List the release files
echo "📋 Generated files:"
ls -la "$FRONTEND_DIR/release/" 2>/dev/null || echo "   (run the build first)"

