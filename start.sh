#!/bin/bash
set -e

echo "🚀 Starting NVIDIA AI Studio..."

# Start backend
cd backend
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Give backend a moment to initialize
sleep 2

# Start frontend dev server
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Backend  → http://localhost:8000"
echo "✅ Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
