#!/bin/bash
# iOS Capture Agent - Phase 1 Demo Startup Script

echo "🚀 Starting iOS Capture Agent (Phase 1 Demo)"
echo "============================================"
echo ""

# Build main process
echo "📦 Building main process..."
npm run build:main
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi
echo "✅ Build complete!"
echo ""

# Start Vite dev server in background
echo "🌐 Starting Vite dev server..."
npm run dev &
VITE_PID=$!
echo "✅ Vite started (PID: $VITE_PID)"
echo ""

# Wait for Vite to be ready
echo "⏳ Waiting for Vite server..."
npx wait-on http://localhost:5173
echo "✅ Vite is ready!"
echo ""

# Launch Electron
echo "🖥️  Launching Electron app..."
NODE_ENV=development npx electron .
ELECTRON_PID=$!

echo ""
echo "✅ iOS Capture Agent is running!"
echo "   - Look for the Electron window"
echo "   - Press Ctrl+C to stop"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping iOS Capture Agent..."
  kill $VITE_PID 2>/dev/null
  kill $ELECTRON_PID 2>/dev/null
  echo "✅ Stopped!"
  exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Wait for Electron
wait $ELECTRON_PID
