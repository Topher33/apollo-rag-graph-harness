# Build Plan: Model-Agnostic Agent Harness and Engine (Node.js)
 
> Reconciled with the workspace AGENTS.md on 2026-10-14; the governing architecture plan is RFC-0001 (Draft).

**Status:** Draft v0.1 · Companion to the white paper · Topher Labs
**Goal:** Demonstrate a governed semantic layer for a federated Apollo supergraph on k3s, with the harness and engine logic as the IP and the language model as a swappable component.
 
> Reconciled against the workspace AGENTS.md. Items marked (reconciled in RFC-0001) were adjusted to match workspace standards.
 
---
 
## 1. Scope of the demo
 
**Prove, end to end:**
1. A schema change in a subgraph triggers the harness.
2. The proposer agent drafts `@relation` / `@semantic` annotations with evidence and opens a PR.
3. A human accepts, edits, or rejects; the decision is logged.
4. Approved annotations compile into a local graph + vector index.
5. An agent answers a multi-hop business question via seed, expand, drill-down over MCP, verifying low-trust edges against the live supergraph.
6. The same eval is re-run on two different models through the adapter layer, showing a score comparison with no knowledge-layer changes.
**Out of scope for v0:** multi-tenant auth, fine-tuning pipeline, non-GraphQL sources, production-grade field-level auth propagation (designed for, stubbed in the demo).
 
## 2. Architecture
 
```
                 ┌──────────────────────────────────────────────┐
                 │                 k3s cluster                  │
                 │                                              │
 Git repo ──PR──▶│  review-bridge ◀──▶ decision-log (Postgres)  │
 (subgraphs)     │        ▲                    ▲                │
      │          │        │                    │                │
      ▼          │  proposer-agent ──▶ model-adapter ──▶ LLM(s) │
 schema-watcher ─┼─▶ ontology-extractor        ▲  (local + hosted)
      │          │        │                    │                │
      ▼          │   glossary-svc ─────────────┘                │
  Apollo Router ◀┼── compressor/indexer ──▶ index-store         │
  + subgraphs    │        │              (Postgres+pgvector)    │
                 │        ▼                    ▲                │
                 │  retrieval-svc (MCP) ───────┘                │
                 │        │                                     │
                 │        └─────▶ Apollo MCP server ──▶ Router  │
                 └──────────────────────────────────────────────┘
```
 
### Demo business domain
A small federated commerce graph, three to four subgraphs with deliberate semantic ambiguity so the proposer has real work to do:
- **customers**: Customer, Address, Contact
- **orders**: Order, OrderLine, Shipment (fields like `customer`, `shipTo`, `billTo`)
- **catalog**: Product, Category, Supplier
- **inventory**: StockLevel, Warehouse
Seed with synthetic data (a few thousand entities) plus a short glossary-source doc set (fake wiki and ticket titles) containing in-house jargon.
## 3. Services
 
| Service | Responsibility | Notes |
|---|---|---|
| `schema-watcher` | Detects supergraph/subgraph SDL changes (git webhook or registry poll), emits diff events | Start with git webhook |
| `ontology-extractor` | Parses SDL with `graphql-js`; outputs node types, edges, cardinality, `@key` joins, embeddable-field flags | Pure function, heavily unit-tested |
| `glossary-svc` | Canonical terms, synonyms, definitions, versions; ingestion from schema descriptions, mutation/event names, docs | Versioned; each annotation records glossary version |
| `proposer-agent` | Per changed type: retrieve glossary + similar approved examples, call model, validate JSON against annotation schema, attach evidence | Never writes free-form relation names; "propose new term" path |
| `review-bridge` | Opens PRs with proposed directives, listens for review outcomes, writes decisions | GitHub or Gitea (use whichever the k3s lab already runs) |
| `decision-log` | Append-only store: proposal, outcome (accept/edit/reject), diff, reviewer comment, model/prompt/glossary versions | The compounding asset; design schema carefully |
| `compressor/indexer` | Candidate edges (schema, kNN, keyword co-occurrence) → constrained LM adjudication → entity resolution → dedupe → vectors → community summaries | Idempotent, incremental by entity hash |
| `index-store` | Postgres + pgvector for nodes, edges (with tier, confidence, evidence, provenance), vectors | Swap-friendly behind a repository interface |
| `retrieval-svc` | `seed`, `expand`, `drilldown` tools over MCP; trust-tier filtering; live verification via Apollo MCP | Depth/branching caps enforced here |
| `model-adapter` | One interface (`complete`, `completeJSON`, `embed`) with providers: local (Ollama/llama.cpp/vLLM), hosted (Anthropic, OpenAI-compatible) | Per-model prompt formatting only; no business logic |
| `eval-harness` | Runs held-out owner-approved set against any configured model; reports acceptance proxy, edit distance, relation-type precision, cost, latency | CLI plus CI job; results stored per model/prompt/glossary version |
 
## 4. Key contracts (define first, in `packages/contracts`)
 
- **Annotation schema** (JSON Schema + TypeScript types): relation type enum, strength class, domain, embed flag, owner, reviewed date.
- **Edge record**: `from`, `to`, `type`, `direction`, `tier` (OWNER | SCHEMA | USAGE | LM), `confidence`, `evidence[]`, `provenance{model, promptVersion, glossaryVersion, ts}`.
- **Decision record**: `proposalId`, `target`, `proposed`, `final`, `outcome`, `reviewer`, `comment`, `versions{...}`.
- **Model adapter interface**: `completeJSON({schema, prompt, temperature, seed})` returns validated JSON or a typed error; `embed(texts[])`.
- **MCP tool schemas** for `seed`, `expand`, `drilldown`.
Treat these as the stable API; everything else is replaceable. Contracts live in `packages/contracts` (see RFC-0001).
 
## 5. Tech choices (defaults, open to agent.md standards)
 
- **Language/runtime:** TypeScript on Node.js (LTS), npm workspaces or pnpm monorepo. Express for HTTP services (per AGENTS.md); the official MCP TypeScript SDK for `retrieval-svc`.
- **GraphQL:** `graphql-js` for parsing; `@apollo/subgraph` and Apollo Router for the demo supergraph; Apollo MCP server for live access.
- **Storage:** Postgres + pgvector (one dependency for decisions, graph tables, and vectors). Kuzu or Neo4j only if traversal performance demands it later.
- **Validation:** Zod or Ajv against shared JSON Schemas; reject and retry on invalid model output.
- **Queue/eventing:** start with Postgres-based jobs (e.g., pg-boss) to avoid adding a broker.
- **Observability:** OpenTelemetry traces across services; log every model call with prompt/model/glossary versions.
- **Packaging/deploy:** Docker images, Helm chart or Kustomize into k3s; local registry. (reconciled in RFC-0001)
## 6. Milestones
 
| # | Milestone | Exit criteria |
|---|---|---|
| M0 | Repo scaffold + contracts | Monorepo per agent.md standards; contracts package with tests; CI green |
| M1 | Demo supergraph on k3s | Router + 3-4 subgraphs + seed data running; Apollo MCP answers a sample query |
| M2 | Ontology extractor + glossary | Extractor outputs ontology JSON for the demo graph; glossary seeded and queryable |
| M3 | Model adapter + eval skeleton | Two providers (one local, one hosted) behind one interface; eval CLI runs a stub set |
| M4 | Proposer + review loop | Schema change → PR with annotations + evidence → accept/edit/reject recorded in decision log |
| M5 | Gold set + baseline | 100-200 owner-labeled items (LM drafts, human corrected); baseline scores for both models |
| M6 | Compressor + index | Candidate gen, constrained adjudication, entity resolution; edges carry tier/confidence/evidence |
| M7 | Retrieval over MCP | seed/expand/drilldown working; agent answers 5 scripted multi-hop questions; low-trust edges verified live |
| M8 | Demo + write-up | Scripted walkthrough, model-swap comparison, metrics, recorded demo, white-paper v0.2 with real numbers |
 
M0-M5 is the critical path to a credible proposal-quality story. M6-M7 is the retrieval payoff.
 
## 7. Evaluation plan
 
- **Proposal quality:** acceptance rate, edit distance from final, relation-type precision/recall on the gold set.
- **Graph quality:** sampled edge audit (precision of LM-inferred edges with evidence), duplicate/entity-resolution error rate.
- **Retrieval quality:** answer correctness on scripted multi-hop questions vs. a vector-only baseline; tokens used; round trips; latency.
- **Model-agnosticism proof:** identical knowledge layer, two models, side-by-side scores, cost, and latency.
- **Stability:** same input run N times; label agreement rate (pinned prompt/model/temperature).
## 8. Risks and decisions to confirm
 
1. **Review surface:** GitHub PRs vs. a self-hosted Git (Gitea) in the k3s lab. Decide based on what's already running.
2. **Local model choice** for the demo given available hardware (GPU in the lab?). Affects adjudication throughput.
3. **Embedding model:** one pinned model and version for corpus and queries; store the version with every vector.
4. **Access control:** demo stubs per-field auth metadata on nodes and filters in `retrieval-svc`; real propagation is post-demo.
5. **Naming and positioning:** product name TBD; verify competing offerings (GraphRAG frameworks, graph/catalog vendors) before any market claims.
6. **Licensing/IP:** keep the harness repo separate from any Apollo-licensed components; confirm terms for anything distributed.
## 9. Workspace standards checklist (answered in RFC-0001 and the workspace AGENTS.md)
 
- Required repo layout, naming, and where new product ideas are registered.
- Standard CI, lint, test, and release conventions.
- Docs/ADR format and where the white paper and plan should live in the repo.
- k3s conventions: namespaces, ingress, secrets, registry, Helm vs. Kustomize.
- Any required templates (README, product brief, threat model).
- Definition of done for a "demonstrable" product idea.