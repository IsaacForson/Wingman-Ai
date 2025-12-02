#!/bin/bash

# Wingman AI - Development Script
# Starts both backend and frontend for development

set -e

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Wingman AI Development Environment${NC}"
echo "================================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo ""
echo -e "${YELLOW}Starting Python backend...${NC}"
cd "$BACKEND_DIR"

# Check if venv exists
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "env.example.txt" ]; then
        cp env.example.txt .env
        echo -e "${YELLOW}Created .env from env.example.txt - please add your API keys${NC}"
    fi
fi

# Start backend in background
python main.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8765/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready!${NC}"
        break
    fi
    sleep 1
done

# Start Frontend
echo ""
echo -e "${YELLOW}Starting Electron frontend...${NC}"
cd "$FRONTEND_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm run electron:dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}🎉 Wingman AI is running!${NC}"
echo ""
echo "Backend:  http://127.0.0.1:8765"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "================================================"

# Wait for both processes
wait
