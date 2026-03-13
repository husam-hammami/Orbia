#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -5

echo "Running database migrations..."
npm run db:push 2>&1 || echo "No db:push script or migration failed (non-critical)"

echo "=== Post-merge setup complete ==="
