#!/bin/bash

# =============================================================================
# CORTEX Medical System - Development Server Startup Script
# =============================================================================

set -e  # Exit on any error

echo "🏥 Starting CORTEX Medical System Development Environment..."
echo "============================================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is available
port_available() {
    ! nc -z localhost "$1" 2>/dev/null
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔄 Killing existing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Clean up any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
kill_port 8000
kill_port 3000

# Start Backend Server
echo "🐍 Starting Backend Server..."
cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run: python3 -m venv venv"
    exit 1
fi

# Activate virtual environment and start backend
source venv/bin/activate

# Check if required packages are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing backend dependencies..."
    pip install -r requirements.txt
fi

echo "🚀 Starting FastAPI server on port 8000..."
uvicorn main_clean_english:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start Frontend Server
echo "⚛️  Starting Frontend Server..."
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🚀 Starting React development server on port 3000..."
npm start &
FRONTEND_PID=$!

# Wait for servers to be ready
echo "⏳ Waiting for servers to be ready..."
sleep 5

# Check if servers are responding
echo "🔍 Checking server status..."

if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ Backend server is running at http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
else
    echo "❌ Backend server is not responding"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend server is running at http://localhost:3000"
else
    echo "❌ Frontend server is not responding"
fi

echo ""
echo "============================================================"
echo "🎉 CORTEX Medical System is ready!"
echo "   📱 Frontend: http://localhost:3000"
echo "   🔧 Backend API: http://localhost:8000"
echo "   📚 API Docs: http://localhost:8000/docs"
echo "============================================================"
echo ""
echo "💡 To stop the servers, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"

# Keep script running and handle Ctrl+C
trap 'echo ""; echo "🛑 Shutting down servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Wait for processes
wait

