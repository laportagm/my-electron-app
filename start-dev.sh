#!/bin/bash

echo "🚀 Starting development environment..."

# 1. Compile the preload script
echo "⚙️ Compiling preload script..."
node compile-preload-dev.js

# 2. Start the Vite development server in the background
echo "🌐 Starting Vite development server..."
npx vite --port 5173 &
VITE_PID=$!

# Function to clean up processes on exit
cleanup() {
  echo "🧹 Cleaning up..."
  
  # Kill the Vite server if it's still running
  if ps -p $VITE_PID > /dev/null; then
    echo "Stopping Vite server (PID: $VITE_PID)..."
    kill $VITE_PID
  fi
  
  # Clean up any temp files
  if [ -f "temp-main-dev.cjs" ]; then
    rm temp-main-dev.cjs
  fi
  
  echo "✅ Cleanup complete"
  exit 0
}

# Set up cleanup on exit
trap cleanup EXIT INT TERM

# 3. Wait for development server and launch Electron
echo "⏳ Waiting for development server to be ready and launching Electron..."
node wait-and-launch.js

# Keep the script running until the user terminates it
echo "👉 Development environment is running. Press Ctrl+C to stop."
wait $VITE_PID