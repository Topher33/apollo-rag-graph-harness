#!/usr/bin/env bash
# M1 exit check: a multi-subgraph query answered by the router, and the Apollo MCP server healthy.
set -euo pipefail
NS=apollo-harness
kubectl -n "$NS" port-forward svc/router 4000:4000 >/dev/null 2>&1 &
PF1=$!
kubectl -n "$NS" port-forward svc/apollo-mcp 8000:8000 >/dev/null 2>&1 &
PF2=$!
trap 'kill $PF1 $PF2 2>/dev/null || true' EXIT
sleep 3

echo "==> router: orders -> customer (customers) -> product (catalog) -> availability (inventory)"
curl -sS -H 'content-type: application/json' localhost:4000/ \
  --data '{"query":"{ orders(limit: 2) { id status customer { name } lines { quantity product { name category { name } totalAvailable } } } }"}'
echo
echo "==> apollo mcp server health"
curl -sS -o /dev/null -w "http %{http_code}\n" localhost:8000/health
echo "MCP endpoint (streamable HTTP): http://localhost:8000/mcp  (while port-forwarded)"
