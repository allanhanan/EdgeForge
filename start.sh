#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting EdgeForge AI Platform"
echo " Meta Global AI Developer Hackathon 2026"
echo "=========================================================="

# Ensure directories exist
mkdir -p backend/storage/models backend/storage/datasets backend/storage/exports backend/storage/runs

# Check if sample model exists, if not generate it
if [ ! -f "sample_assets/models/edge_tiny_yolo.onnx" ]; then
    echo "[*] Generating initial sample model and dataset..."
    .venv/bin/python sample_assets/init_samples.py
fi

# Start Backend in background
echo "[*] Starting FastAPI Backend on port 8000..."
PYTHONPATH=. .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend healthcheck
echo "[*] Waiting for backend to become ready..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:8000/health > /dev/null; then
        echo "[✓] Backend is ready at http://127.0.0.1:8000"
        break
    fi
    sleep 1
done

# Start Frontend
echo "[*] Starting Next.js Frontend on port 3000..."
cd frontend
pnpm dev --port 3000 &
FRONTEND_PID=$!
cd ..

echo "=========================================================="
echo " EdgeForge is running!"
echo " Web UI:     http://localhost:3000"
echo " API Docs:   http://localhost:8000/docs"
echo " Health:     http://localhost:8000/health"
echo "=========================================================="
echo "Press CTRL+C to terminate both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
