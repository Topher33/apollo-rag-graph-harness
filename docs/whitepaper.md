# A Governed Semantic Layer for Federated GraphQL Graphs
 
**Status:** Draft v0.1 · Topher Labs · working title (product name TBD)
**Thesis:** The durable asset in agentic retrieval is not the model and not the vector store. It is the governed, owner-approved record of what an organization's data *means* and how it relates, plus the harness logic that keeps that record current.
 
---
 
## 1. Abstract
 
Enterprises that run federated GraphQL supergraphs already have a typed, versioned, reviewed description of their data. What they lack is a shared *semantic* map: which relationships are business-critical, what the types mean in the company's own vocabulary, and how closely related two pieces of information are. Retrieval-augmented generation (RAG) systems try to rebuild that map after the fact with one-shot extraction pipelines, and the result is ungoverned, drifts from the source, and cannot be trusted by the teams who own the data.
 
We propose a **semantic layer for the supergraph**: a model-agnostic agent harness that proposes `@relation` and `@semantic` schema annotations as pull requests, lets data owners approve or edit them, and compiles the approved annotations into a local retrieval index (graph plus vectors) that agents query with a seed, expand, drill-down pattern. Live, authoritative detail is fetched through the existing GraphQL API (for example via Apollo's MCP server). The language model is a replaceable component. The harness, the decision log, the glossary, and the evaluation suite are the intellectual property.
 
## 2. Problem
 
1. **Schemas describe structure, not meaning.** Introspection shows that `Order.customer` links to `Customer`. It does not say whether that is the purchaser, the ship-to party, or the billing contact.
2. **Instance relations live in backends.** The supergraph knows types and keys; it does not know that Customer 42 relates to Orders 7, 9, and 13 until a resolver runs.
3. **One-shot GraphRAG pipelines are ungoverned.** LM-extracted edges can be hallucinated, unlabeled by provenance, inconsistent between runs, and invisible to the owners accountable for the data.
4. **Edge and local deployments need small, topical indexes**, not a full replica of the corpus on every node.
5. **Proprietary business nouns and verbs** defeat generic extractors, and per-customer fine-tuning is expensive and couples the product to one model.
## 3. Approach
 
### 3.1 Principles
 
- **Model-agnostic.** All business knowledge lives in data the harness owns (glossary, decision log, examples), never only in model weights.
- **Governed.** Every semantic claim has provenance and an accountable owner. Owner decisions override inference.
- **Layered trust.** Edges carry a provenance tier: owner-declared, schema-derived, usage-observed, LM-inferred, in descending trust.
- **Map locally, verify live.** The local index tells an agent *where to look*. The source API remains the system of record.
- **Incremental.** Work is triggered by schema diffs and data change, not full re-crawls.
### 3.2 Components
 
| Component | Responsibility |
|---|---|
| Ontology extractor | Walks the supergraph SDL: node types, edge types, cardinality, `@key` joins, embeddable text fields |
| Glossary service | Canonical business terms, synonyms, definitions, versions; mined from schema descriptions, mutation and event names, docs, tickets |
| Proposer agent | For each new or changed type, proposes annotations with evidence, using retrieved approved examples and glossary entries as context |
| Review workflow | Opens annotation proposals as PRs against the subgraph repo; captures accept, edit, reject, and reviewer comments |
| Decision log | Append-only record of proposals and owner outcomes; the primary compounding asset |
| Compressor / indexer | Candidate-edge generation, LM adjudication, entity resolution, dedupe, community summaries, vector build |
| Retrieval service | Seed, expand, drill-down over the local index, exposed over MCP |
| Eval harness | Held-out owner-approved annotations; scores any model on acceptance rate, edit distance, relation precision |
| Model adapter layer | One interface over hosted and local models; per-model prompt formatting only |
 
### 3.3 Annotation vocabulary
 
A small, centrally published controlled vocabulary, extended only through a "propose new term" path that requires owner approval:
 
```graphql
directive @relation(
  type: RelationType!      # e.g. PURCHASED_BY, CONTAINS, REFERENCES
  strength: Strength!      # IDENTITY | CONTAINMENT | REFERENCE | ASSOCIATION
  owner: String
  reviewed: Date
) on FIELD_DEFINITION
 
directive @semantic(
  domain: String!          # e.g. "billing"
  embed: Boolean = false
  term: String             # glossary canonical term
) on OBJECT | FIELD_DEFINITION
```
 
Owners declare relation *type* and *strength class*. The numeric closeness score is computed by the system from usage, embedding similarity, and agreement across adjudication samples, because hand-assigned weights are inconsistent across teams and decay.
 
### 3.4 Pipeline
 
1. **Detect.** A schema-diff watcher fires on registry or repo change.
2. **Extract.** Ontology and glossary updated.
3. **Propose.** Agent drafts annotations per changed type with evidence; opens PRs.
4. **Review.** Owners accept, edit, or reject. Every outcome is logged.
5. **Compile.** Approved annotations drive candidate generation (schema edges, nearest neighbors, keyword co-occurrence) and constrained LM adjudication of the remaining pairs. Each edge stores relation type, direction, confidence, evidence span, model and prompt version, tier.
6. **Index.** Entity text plus a summary of neighbors is embedded; graph and vectors are written to a local store.
7. **Serve.** Agents call seed, expand, drill-down. Low-trust edges are verified against the live API before deep reasoning.
### 3.5 Retrieval pattern
 
1. **Seed** with vector or keyword lookup to find entry nodes.
2. **Expand** one or two hops and return a compact subgraph (entities, edge types, summaries, document pointers).
3. **Gate.** The model, or a cheap heuristic on edge weight and centrality, selects which nodes merit depth.
4. **Drill down** with filtered vector search or a live GraphQL call, and cache the result at the node for follow-up queries.
The graph stays centralized because cross-topic edges are often the most valuable. Vectors can be sharded by domain and cached at the edge with topic-aware prefetch.
 
## 4. Why the harness is the moat
 
- **Decision log.** Approved, edited, and rejected annotations are customer-specific ground truth that no competitor can reproduce. Edits are the strongest signal (proposal and correction pairs).
- **Glossary.** A versioned map of proprietary nouns and verbs, portable across models.
- **Eval suite.** Makes model swaps safe: "this model scores X% against this tenant's approved set."
- **Export path.** The decision log exports as model-neutral SFT or DPO data, so per-tenant small-model tuning is an optional accelerator, not a dependency.
## 5. Training strategy (optional, deferred)
 
- **Phase 1, no training.** Glossary plus retrieved approved examples in the prompt; constrained output; "propose new term" path.
- **Phase 2, cold start.** Domain experts label 200 to 500 items using proposals as drafts; active learning picks the uncertain ones. This becomes the eval set.
- **Phase 3, tune from the feedback loop.** Once a few thousand decisions exist, tune a small per-tenant model for triage and keep a larger model for hard cases. Do this only if the eval suite shows a gap prompting cannot close.
## 6. Risks and open questions
 
| Risk | Mitigation |
|---|---|
| Platform risk: the graph vendor ships a similar feature | Stay schema-source-agnostic (any GraphQL, later OpenAPI and SQL); own the governance and decision-log layer |
| Hallucinated or unstable LM edges | Require evidence spans; pin model, prompt, and temperature; cache decisions; confidence via sample agreement or logprobs, not self-report |
| Access control leakage through a copied index | Carry field-level auth into index metadata; filter at query time; default to pointers over copied content; treat as a first-class design problem |
| Owner rubber-stamping | Sample accepted proposals for second review; track edit rate |
| Annotation and glossary drift | Owner and last-reviewed fields; staleness flags; versioned glossary |
| Fan-out explosion on supernodes | Depth and branching caps; rank by edge weight |
| Competitive overlap with GraphRAG frameworks and data catalogs | **To verify before positioning**: current offerings from GraphRAG-style tools and catalog vendors; this draft makes no market claims |
 
## 7. Demonstration
 
A small federated business supergraph (customers, orders, catalog and inventory subgraphs) running on a k3s cluster alongside the harness services, with a local model by default and a hosted model swapped in through the adapter layer to show model-agnosticism. See the companion build plan.
 
## 8. Next steps
 
1. Build the ontology extractor and proposer against the demo supergraph.
2. Validate proposal quality with a domain expert; record acceptance and edit rates as the first eval baseline.
3. Stand up compile, index, and retrieval; demonstrate seed, expand, drill-down from an agent.
4. Run the same eval against two or more models and publish the comparison.