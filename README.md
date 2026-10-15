# apollo-rag-graph-harness

Working title. A model-agnostic agent harness and engine that proposes `@relation` / `@semantic` annotations on a federated Apollo GraphQL supergraph (as PRs), records owner decisions, and compiles approved annotations into a local graph + vector retrieval index served over MCP. The harness, decision log, glossary, and eval suite are the IP; the language model is a swappable component.

Stage: **product idea**, M0 + M1 code written (see Status). Architecture is governed by RFC-0001 (Draft).

## Docs
- [docs/whitepaper.md](docs/whitepaper.md) - thesis, approach, moat, risks (draft v0.1)
- [docs/build-plan.md](docs/build-plan.md) - Node.js architecture, services, contracts, milestones M0-M8
- RFC-0001 - `../architecture-governance/rfcs/RFC-0001-apollo-rag-graph-harness.md` (Draft)

## Layout
- `packages/contracts` - M0: vocabulary, JSON Schemas, validators, trust-tier logic, model-adapter contract, MCP tool schemas
- `demo/subgraphs` - M1: four federated subgraphs (customers, orders, catalog, inventory) + seed data + supergraph composition
- `demo/operations`, `demo/glossary-sources.md` - sample MCP operations and fictional glossary source material
- `deploy/` - Kustomize manifests, Dockerfile usage, `up.sh` / `verify.sh` (see `deploy/README.md`)
- `ARCHITECTURE_OVERVIEW.txt` - current services, ports, datastores

## Status
- M0 (contracts) and M1 (demo supergraph + k3s manifests) written; docs reconciled with the workspace `AGENTS.md`.
- Run only so far: the dependency-free tests. Apollo-dependent tests and the k3s deploy have not been run (no package or cluster access when written) - see the verification table in `deploy/README.md`.
- Next: run `deploy/scripts/up.sh` from WSL, review RFC-0001 and settle its open decisions, then M2 (ontology extractor + glossary).

## Conventions (from workspace AGENTS.md)
Node.js (Express for API services, React + Vite for UI), tests with coverage (unit, integration, acceptance), architecture changes via RFC, progress recorded in `../change-logs/`, `ARCHITECTURE_OVERVIEW.txt` updated when services are added.

## License
Dual-licensed: **AGPL-3.0-only** for everyone able to comply with it (free for individuals, startups and open-source projects), plus a **commercial license** from TopherLabs LLC for embedding in closed-source products or running modified versions without publishing changes. See [NOTICE](NOTICE) and [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

> Status: the official AGPL-3.0 text is not installed yet, so `LICENSE` still holds a proprietary placeholder (no license granted). Run `scripts/install-agpl-license.sh` from a machine with internet access before publishing. Outside contributions need a CLA first ([CONTRIBUTING.md](CONTRIBUTING.md)).
