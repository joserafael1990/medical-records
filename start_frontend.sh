#!/bin/bash
# =============================================================================
# AVANT Medical System - Frontend Server Startup
# =============================================================================

cd "/Users/rafa.garcia/Documents/software projects/Historias clinicas/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🚀 Iniciando frontend en puerto 3000..."
echo "🌐 Application: http://localhost:3000"
echo "⚛️  Framework: React + TypeScript"
echo "=========================================="

npm start

