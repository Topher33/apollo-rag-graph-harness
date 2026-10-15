# apollo-rag-graph-harness

Working title. A model-agnostic agent harness and engine that proposes `@relation` / `@semantic` annotations on a federated Apollo GraphQL supergraph (as PRs), records owner decisions, and compiles approved annotations into a local graph + vector retrieval index served over MCP. The harness, decision log, glossary, and eval suite are the IP; the language model is a swappable component.

Stage: **product idea** (no code yet). Architecture is governed by RFC-0001.

## Docs
- [docs/whitepaper.md](docs/whitepaper.md) - thesis, approach, moat, risks (draft v0.1)
- [docs/build-plan.md](docs/build-plan.md) - Node.js architecture, services, contracts, milestones M0-M8
- RFC-0001 - `../architecture-governance/rfcs/RFC-0001-apollo-rag-graph-harness.md` (Draft)

## Status
- Docs reconciled with the workspace `AGENTS.md`.
- Next: review RFC-0001, settle its open decisions, then start M0 (scaffold + contracts).

## Conventions (from workspace AGENTS.md)
Node.js (Express for API services, React + Vite for UI), tests with coverage (unit, integration, acceptance), architecture changes via RFC, progress recorded in `../change-logs/`, `ARCHITECTURE_OVERVIEW.txt` updated when services are added.
