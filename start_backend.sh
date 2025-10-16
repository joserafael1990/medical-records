#!/bin/bash
# =============================================================================
# CORTEX Medical System - Backend Server Startup
# =============================================================================

cd "/Users/rafa.garcia/Documents/software projects/Historias clinicas/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run: python3 -m venv venv"
    exit 1
fi

source venv/bin/activate

echo "🚀 Iniciando backend en puerto 8000..."
echo "📚 API Documentation: http://localhost:8000/docs"
echo "📝 Main file: main_clean_english.py"
echo "============================================"

uvicorn main_clean_english:app --host 0.0.0.0 --port 8000 --reload

