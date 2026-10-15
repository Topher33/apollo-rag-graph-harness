#!/usr/bin/env bash
# Install deps, compose the supergraph, build the subgraph image, load it into k3s, and apply the manifests.
# Run from WSL (needs: node >= 22, npm, docker, kubectl; k3s binary for image import, otherwise push to a registry).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
IMAGE="${IMAGE:-harness/demo-subgraphs:dev}"
NS=apollo-harness

echo "==> npm install (creates package-lock.json on first run)"
npm install

echo "==> compose supergraph"
npm run compose
cp demo/operations/*.graphql deploy/k8s/generated/

echo "==> build $IMAGE"
docker build -f demo/subgraphs/Dockerfile -t "$IMAGE" .

if command -v k3s >/dev/null 2>&1; then
  echo "==> import image into k3s containerd"
  docker save "$IMAGE" | sudo k3s ctr images import -
else
  echo "!! k3s binary not found on this host. Push $IMAGE to a registry your cluster can pull from,"
  echo "   then set the image name in deploy/k8s/kustomization.yaml (images: harness/demo-subgraphs)."
fi

echo "==> kubectl apply -k deploy/k8s"
kubectl apply -k deploy/k8s

echo "==> waiting for rollouts"
for d in customers orders catalog inventory router apollo-mcp; do
  kubectl -n "$NS" rollout status "deploy/$d" --timeout=180s
done
echo "done. Next: deploy/scripts/verify.sh"
