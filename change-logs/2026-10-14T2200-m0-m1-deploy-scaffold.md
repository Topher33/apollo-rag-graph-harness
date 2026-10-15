# M0/M1 scaffold and deploy manifests (2026-10-14)

## Summary
- M0 `packages/contracts`: relation vocabulary, trust tiers, JSON Schemas, `@relation`/`@semantic` directives, mock model adapter.
- M1 `demo/subgraphs`: four federated subgraphs (customers, orders, catalog, inventory), ~8,500 seeded entities, supergraph compose script.
- `deploy/`: Kustomize manifests (subgraphs, Apollo Router, Apollo MCP Server), `up.sh`, `verify.sh`.
- Image tags pinned from upstream release pages: router `v2.18.0`, MCP server `v1.20.0` (last 1.x, matches v1 config keys). MCP server positional config-file argument confirmed against Apollo docs. Neither tag has been pulled.

## Status
- Not yet run: schema validator tests, federation test, Docker build, k3s deploy.
- Pending: RFC-0001 is still Draft (needs acceptance / move to `/implementation`). Open RFC questions: local model + GPU, embedding model, product name.

## Links
- Sessions: "Apollo RAG graph and chat session" (this), prior session that wrote M0/M1 (not readable from here)
- PRs: none (local commits only, not pushed)
- RFC: RFC-0001
- Affected services: contracts, demo subgraphs, router, MCP server
