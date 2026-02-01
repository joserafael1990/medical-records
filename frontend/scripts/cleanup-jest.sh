#!/bin/bash
# Jest Cleanup Script - Kills orphaned Jest processes
# Usage: ./scripts/cleanup-jest.sh

echo "🧹 Cleaning up Jest processes..."

# Kill jest-worker processes
WORKER_COUNT=$(pgrep -f "jest-worker" | wc -l | tr -d ' ')
if [ "$WORKER_COUNT" -gt 0 ]; then
  echo "Found $WORKER_COUNT jest-worker processes. Killing..."
  pkill -f "jest-worker"
  echo "✅ Killed jest-worker processes"
else
  echo "✅ No jest-worker processes found"
fi

# Kill main jest processes
JEST_COUNT=$(pgrep -f "node.*jest" | wc -l | tr -d ' ')
if [ "$JEST_COUNT" -gt 0 ]; then
  echo "Found $JEST_COUNT jest processes. Killing..."
  pkill -f "node.*jest"
  echo "✅ Killed jest processes"
else
  echo "✅ No jest processes found"
fi

echo "🎉 Cleanup complete!"
