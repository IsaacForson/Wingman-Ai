#!/bin/bash

# Wingman AI - Complete Build Script
# Builds both backend executable and frontend DMG

set -e

echo "🚀 Building Complete Wingman AI Package"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build Backend
echo -e "${YELLOW}Step 1: Building Python backend executable...${NC}"
cd "$BACKEND_DIR"

if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Install PyInstaller
pip install pyinstaller -q

# Build backend
pyinstaller --clean --noconfirm wingman.spec

echo -e "${GREEN}✓ Backend executable built${NC}"

# Step 2: Copy backend to frontend resources
echo ""
echo -e "${YELLOW}Step 2: Bundling backend with frontend...${NC}"

# Create the backend bundle location
mkdir -p "$FRONTEND_DIR/resources/backend"

# Copy the built executable
if [ -d "$BACKEND_DIR/dist/wingman-backend.app" ]; then
    cp -R "$BACKEND_DIR/dist/wingman-backend.app" "$FRONTEND_DIR/resources/backend/"
elif [ -f "$BACKEND_DIR/dist/wingman-backend" ]; then
    cp "$BACKEND_DIR/dist/wingman-backend" "$FRONTEND_DIR/resources/backend/"
fi

# Copy the env example
cp "$BACKEND_DIR/env.example.txt" "$FRONTEND_DIR/resources/backend/.env.example"

echo -e "${GREEN}✓ Backend bundled${NC}"

# Step 3: Build Frontend DMG
echo ""
echo -e "${YELLOW}Step 3: Building Electron app...${NC}"
cd "$FRONTEND_DIR"

npm install
npm run build:mac

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Build Complete!${NC}"
echo ""
echo "📦 DMG Location:"
echo "   $FRONTEND_DIR/release/"
echo ""
ls -lh "$FRONTEND_DIR/release/"*.dmg 2>/dev/null || echo "   No DMG found"
echo ""
echo "========================================"

