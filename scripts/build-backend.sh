#!/bin/bash

# Wingman AI - Build Backend Executable
# Creates a standalone backend that doesn't require Python

set -e

echo "🔧 Building Wingman AI Backend..."
echo "=================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Run setup first."
    exit 1
fi

# Install PyInstaller if not present
pip install pyinstaller

# Build the executable
echo "📦 Building standalone executable..."
pyinstaller --clean wingman.spec

echo ""
echo "✅ Backend built successfully!"
echo ""
echo "📁 Output: $BACKEND_DIR/dist/wingman-backend"
echo ""

