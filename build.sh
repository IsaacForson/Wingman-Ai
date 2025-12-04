#!/bin/bash

# ============================================
# Wingman AI - Full Build Script
# ============================================
# This script builds everything:
# - Backend (Python → Executable)
# - Frontend (React + Electron → DMG)
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Wingman AI - Build Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Parse arguments
BUILD_BACKEND=true
BUILD_FRONTEND=true
ARCH="arm64"  # Default to Apple Silicon

while [[ $# -gt 0 ]]; do
  case $1 in
    --frontend-only)
      BUILD_BACKEND=false
      shift
      ;;
    --backend-only)
      BUILD_FRONTEND=false
      shift
      ;;
    --intel|--x64)
      ARCH="x64"
      shift
      ;;
    --arm64|--silicon)
      ARCH="arm64"
      shift
      ;;
    --help|-h)
      echo "Usage: ./build.sh [options]"
      echo ""
      echo "Options:"
      echo "  --frontend-only   Only rebuild frontend (skip backend)"
      echo "  --backend-only    Only rebuild backend (skip frontend)"
      echo "  --intel, --x64    Build for Intel Macs"
      echo "  --arm64, --silicon Build for Apple Silicon (default)"
      echo "  --help, -h        Show this help"
      echo ""
      echo "Examples:"
      echo "  ./build.sh                    # Full build for Apple Silicon"
      echo "  ./build.sh --intel            # Full build for Intel"
      echo "  ./build.sh --frontend-only    # Only rebuild frontend"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}Build Configuration:${NC}"
echo "  Architecture: $ARCH"
echo "  Build Backend: $BUILD_BACKEND"
echo "  Build Frontend: $BUILD_FRONTEND"
echo ""

# ============================================
# Step 1: Build Backend
# ============================================
if [ "$BUILD_BACKEND" = true ]; then
  echo -e "${BLUE}[1/2] Building Backend...${NC}"
  cd "$BACKEND_DIR"
  
  # Activate virtual environment
  if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
  else
    echo -e "${RED}Error: Virtual environment not found at $BACKEND_DIR/venv${NC}"
    echo "Run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
  fi
  
  # Clean previous build
  echo "  Cleaning previous build..."
  rm -rf build dist wingman-backend.spec 2>/dev/null || true
  
  # Build with PyInstaller (--onedir is MUCH faster to start than --onefile)
  echo "  Running PyInstaller..."
  pyinstaller --onedir --name wingman-backend main.py
  
  # Copy .env to dist folder
  if [ -f ".env" ]; then
    cp .env dist/wingman-backend/
  fi
  
  if [ -d "dist/wingman-backend" ]; then
    echo -e "${GREEN}  ✓ Backend built successfully!${NC}"
  else
    echo -e "${RED}  ✗ Backend build failed!${NC}"
    exit 1
  fi
  
  deactivate 2>/dev/null || true
else
  echo -e "${YELLOW}[1/2] Skipping Backend (--frontend-only)${NC}"
fi

# ============================================
# Step 2: Build Frontend
# ============================================
if [ "$BUILD_FRONTEND" = true ]; then
  echo ""
  echo -e "${BLUE}[2/2] Building Frontend...${NC}"
  cd "$FRONTEND_DIR"
  
  # Update architecture in package.json
  echo "  Setting architecture to: $ARCH"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' "s/\"arch\": \[\"arm64\"\]/\"arch\": [\"$ARCH\"]/" package.json
    sed -i '' "s/\"arch\": \[\"x64\"\]/\"arch\": [\"$ARCH\"]/" package.json
  else
    # Linux sed
    sed -i "s/\"arch\": \[\"arm64\"\]/\"arch\": [\"$ARCH\"]/" package.json
    sed -i "s/\"arch\": \[\"x64\"\]/\"arch\": [\"$ARCH\"]/" package.json
  fi
  
  # Build
  echo "  Running npm build..."
  npm run build:mac
  
  # Find the output file
  DMG_FILE=$(find release -name "*.dmg" -newer "$FRONTEND_DIR/package.json" 2>/dev/null | head -1)
  
  if [ -n "$DMG_FILE" ]; then
    echo -e "${GREEN}  ✓ Frontend built successfully!${NC}"
  else
    echo -e "${RED}  ✗ Frontend build failed!${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}[2/2] Skipping Frontend (--backend-only)${NC}"
fi

# ============================================
# Done!
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Build Complete! 🎉${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

if [ "$BUILD_FRONTEND" = true ]; then
  echo -e "Output: ${BLUE}$FRONTEND_DIR/release/${NC}"
  echo ""
  ls -la "$FRONTEND_DIR/release/"*.dmg 2>/dev/null | tail -3
  echo ""
  echo -e "${YELLOW}To install:${NC}"
  echo "  1. Open the DMG file"
  echo "  2. Drag Wingman AI to Applications"
  echo "  3. Launch and enjoy! 🚀"
fi

