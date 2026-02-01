#!/bin/bash
# Simple test to debug Electron app

echo "🔧 Testing iOS Capture Agent"
echo "=============================="
echo ""

# Kill any existing processes
echo "1️⃣  Cleaning up old processes..."
pkill -f "electron.*ios-capture" 2>/dev/null
pkill -f "vite.*ios-capture" 2>/dev/null
sleep 1
echo "✅ Cleanup done"
echo ""

# Start Vite
echo "2️⃣  Starting Vite dev server..."
npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!
echo "✅ Vite started (PID: $VITE_PID)"
echo ""

# Wait for Vite
echo "3️⃣  Waiting for Vite to be ready..."
for i in {1..10}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Vite is ready!"
    break
  fi
  echo "   Waiting... ($i/10)"
  sleep 1
done
echo ""

# Build main process
echo "4️⃣  Building main process..."
npm run build:main
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  kill $VITE_PID 2>/dev/null
  exit 1
fi
echo "✅ Build complete!"
echo ""

# Launch Electron with debug output
echo "5️⃣  Launching Electron app..."
echo "   Check the terminal output below for debug messages:"
echo "   ═════════════════════════════════════════"
echo ""

NODE_ENV=development npx electron . 2>&1 | tee /tmp/electron.log

# Cleanup on exit
kill $VITE_PID 2>/dev/null
