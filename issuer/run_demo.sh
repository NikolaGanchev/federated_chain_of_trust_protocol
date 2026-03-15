#!/usr/bin/env bash
set -euo pipefail

BIN="./target/release/fctp-node"
PIDS=()

cleanup() {
    echo -e "\nStopping nodes…"
    for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT

echo "Building fctp-node"
cargo build --release 2>&1 | tail -3
echo "Build complete"

mkdir -p logs

echo "Starting nodes"

start_node() {
    local name=$1; shift
    RUST_LOG=info "$BIN" "$@" &>> "logs/${name}.log" &
    PIDS+=($!)
    echo "  $name  PID=${PIDS[-1]}"
}

start_node sofia \
    --issuer-id http://localhost:3001 --display-name "Sofia" --port 3001 \
    --claim age_over_18 \
    --parents http://localhost:3003 \
    --ttl 3600 --verification-delegation call

start_node blagoevgrad \
    --issuer-id http://localhost:3002 --display-name "Blagoevgrad" --port 3002 \
    --claim age_over_18 \
    --parents http://localhost:3003 \
    --verification-delegation call \
    --ttl 3600

start_node bulgaria \
    --issuer-id http://localhost:3003 --display-name "Bulgaria" --port 3003 \
    --claim age_over_18 \
    --parents http://localhost:3005 \
    --trusts http://localhost:3001 \
    --trusts http://localhost:3002 \
    --verification-delegation call \
    --ttl 7200

start_node romania \
    --issuer-id http://localhost:3004 --display-name "Romania" --port 3004 \
    --claim age_over_18 \
    --parents http://localhost:3005 \
    --verification-delegation call \
    --ttl 7200

start_node europe \
    --issuer-id http://localhost:3005 --display-name "Europe" --port 3005 \
    --claim age_over_18 \
    --trusts http://localhost:3003 \
    --trusts http://localhost:3004 \
    --verification-delegation call \
    --ttl 86400

echo "All nodes started"

echo "Waiting for nodes to start and crawl (8s)…"
sleep 8
echo "Ready"

gsleep infinity
