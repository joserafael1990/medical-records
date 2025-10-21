#!/bin/bash
# Run this after Node.js is installed

echo "🎯 Finishing Claude Code CLI installation..."
echo ""

# Wait a moment and reload PATH
sleep 2

# Source profile files
[ -f ~/.zshrc ] && source ~/.zshrc
[ -f ~/.zprofile ] && source ~/.zprofile

# Add common Node paths
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Check if npm is now available
if command -v npm &> /dev/null; then
    echo "✅ Node.js is ready!"
    echo "📦 Installing Claude Code CLI..."
    echo ""
    
    npm install -g @anthropic-ai/claude-code
    
    echo ""
    echo "🎉 SUCCESS! Claude Code CLI is installed!"
    echo ""
    echo "🚀 Try running: claude-code --version"
    echo ""
else
    echo "⚠️  Node.js not found yet."
    echo "   Please close this terminal and open a new one, then run this script again."
    echo ""
    echo "   Or restart your terminal with: source ~/.zprofile"
fi

