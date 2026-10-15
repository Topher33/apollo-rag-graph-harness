# Deploying the demo supergraph to k3s (M1)

Everything here runs from your **WSL** shell (needs `node >= 22`, `npm`, `docker`, `kubectl`; the `k3s` binary on the same host for image import). The demo was written without network or cluster access, so **nothing in this folder has been executed against Apollo packages, images, or a cluster yet** - see "Verification status".

## Run it
```bash
cd product-ideas/apollo-rag-graph-harness
deploy/scripts/up.sh        # npm install, compose supergraph, build image, import into k3s, kubectl apply -k, wait for rollouts
deploy/scripts/verify.sh    # router answers a 4-subgraph query; MCP server /health
```
Tests are user-led (per workspace AGENTS.md). When you want them: `npm test` (all) or `npm run test:coverage`.

## Before the first deploy: pin the two Apollo images
`deploy/k8s/kustomization.yaml` pins `ghcr.io/apollographql/router:v2.18.0` and `ghcr.io/apollographql/apollo-mcp-server:v1.20.0`. These tags come from the upstream release pages but have **not been pulled**. Check they exist (`docker pull ...`) and change them with `kustomize edit set image` or by editing the file. Apollo also publishes a combined `ghcr.io/apollographql/apollo-runtime` image if you prefer one container.

Also confirm in `deploy/k8s/mcp-deploy.yaml` that your MCP server version takes the config file as its positional argument (`args: ["/config/mcp.yaml"]`); the config keys in `mcp-config.yaml` follow the v1 config-file reference.

## What gets deployed (namespace `apollo-harness`)
| Workload | Port | Notes |
|---|---|---|
| customers / orders / catalog / inventory | 4001-4004 | one image, `SUBGRAPH` env selects the subgraph; in-memory seed data |
| router | 4000 (+8088 health) | local supergraph from the `router-config` ConfigMap |
| apollo-mcp | 8000 | streamable HTTP; operations from `demo/operations/` plus introspection tools |

Use it: `kubectl -n apollo-harness port-forward svc/router 4000:4000` then POST GraphQL to `http://localhost:4000/`, or point an MCP client at `http://localhost:8000/mcp`.

## Verification status (2026-10-14)
| Item | Status |
|---|---|
| Seed data generator, resolver logic, contract vocabulary/trust/directives/adapter | **Run**: 25 dependency-free tests passed |
| Syntax of all JS files, YAML parse of all manifests, shell syntax of scripts | Checked |
| Schema validators (`packages/contracts/test/validate.test.js`) | Written, **not run** (needs `ajv`) |
| Federation composition + cross-subgraph query (`demo/subgraphs/test/federation.test.js`) | Written, **not run** (needs Apollo packages) |
| Docker build, k3s deploy, router, MCP server, image tags, MCP CLI arg | **Not run / not verified** |

## Troubleshooting
- `npm ci` fails in the Docker build: run `npm install` at the repo root first so `package-lock.json` exists (`up.sh` does this).
- Router `CrashLoopBackOff`: check `kubectl -n apollo-harness logs deploy/router`; usually a missing/invalid supergraph (re-run `npm run compose`) or an image/flag mismatch for the pinned tag.
- Subgraph pods not ready: `kubectl -n apollo-harness logs deploy/orders` etc.; `/healthz` must return 200.
