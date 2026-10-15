import {
  RELATION_TYPES, STRENGTH_CLASSES, TRUST_TIERS, DIRECTIONS, DECISION_OUTCOMES,
  TERM_KINDS, ADAPTER_ERROR_CODES, LIMITS,
} from './vocabulary.js';

const D7 = 'http://json-schema.org/draft-07/schema#';
export const ids = Object.freeze({
  annotation: 'urn:harness:schema:annotation',
  edge: 'urn:harness:schema:edge',
  decision: 'urn:harness:schema:decision',
  termProposal: 'urn:harness:schema:term-proposal',
  completeJsonRequest: 'urn:harness:schema:adapter-complete-json-request',
  completeJsonResponse: 'urn:harness:schema:adapter-complete-json-response',
});

const str = { type: 'string', minLength: 1 };

export const annotationSchema = {
  $schema: D7,
  $id: ids.annotation,
  title: 'Annotation',
  description: 'A proposed or approved @relation / @semantic annotation on a schema type or field.',
  type: 'object',
  additionalProperties: false,
  required: ['target'],
  properties: {
    target: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: { type: str, field: str },
    },
    relation: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'strength'],
      properties: {
        type: { enum: [...RELATION_TYPES] },
        strength: { enum: [...STRENGTH_CLASSES] },
        owner: str,
        reviewed: { type: 'string', format: 'date' },
      },
    },
    semantic: {
      type: 'object',
      additionalProperties: false,
      required: ['domain'],
      properties: { domain: str, embed: { type: 'boolean', default: false }, term: str },
    },
  },
  anyOf: [{ required: ['relation'] }, { required: ['semantic'] }],
  allOf: [
    // @relation applies to FIELD_DEFINITION only
    { if: { required: ['relation'] }, then: { properties: { target: { required: ['type', 'field'] } } } },
  ],
};

export const edgeSchema = {
  $schema: D7,
  $id: ids.edge,
  title: 'Edge',
  type: 'object',
  additionalProperties: false,
  required: ['from', 'to', 'type', 'direction', 'tier', 'confidence', 'provenance'],
  properties: {
    from: str,
    to: str,
    type: { enum: [...RELATION_TYPES, 'OTHER'] },
    proposedTerm: str,
    direction: { enum: [...DIRECTIONS] },
    tier: { enum: [...TRUST_TIERS] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['source', 'snippet'],
        properties: { source: str, snippet: str, ref: str },
      },
    },
    provenance: {
      type: 'object',
      additionalProperties: false,
      required: ['ts'],
      properties: {
        ts: { type: 'string', format: 'date-time' },
        model: str,
        promptVersion: str,
        glossaryVersion: str,
        schemaVersion: str,
      },
    },
  },
  allOf: [
    // LM-inferred edges must carry evidence and the model/prompt that produced them
    {
      if: { properties: { tier: { const: 'LM' } }, required: ['tier'] },
      then: {
        required: ['evidence'],
        properties: {
          evidence: { minItems: 1 },
          provenance: { required: ['ts', 'model', 'promptVersion'] },
        },
      },
    },
    // Deterministic tiers are certain by definition
    { if: { properties: { tier: { enum: ['OWNER', 'SCHEMA'] } }, required: ['tier'] }, then: { properties: { confidence: { const: 1 } } } },
    // The OTHER bucket must name the term being proposed
    { if: { properties: { type: { const: 'OTHER' } }, required: ['type'] }, then: { required: ['proposedTerm'] } },
  ],
};

export const decisionSchema = {
  $schema: D7,
  $id: ids.decision,
  title: 'Decision',
  description: 'Append-only record of a proposal and the owner outcome. The primary compounding asset.',
  type: 'object',
  additionalProperties: false,
  required: ['proposalId', 'proposed', 'final', 'outcome', 'reviewer', 'ts', 'versions'],
  properties: {
    proposalId: str,
    proposed: { $ref: ids.annotation },
    final: { anyOf: [{ $ref: ids.annotation }, { type: 'null' }] },
    outcome: { enum: [...DECISION_OUTCOMES] },
    reviewer: str,
    comment: { type: 'string' },
    ts: { type: 'string', format: 'date-time' },
    versions: {
      type: 'object',
      additionalProperties: false,
      required: ['vocabulary'],
      properties: { vocabulary: str, glossary: str, prompt: str, model: str },
    },
  },
  allOf: [
    { if: { properties: { outcome: { const: 'REJECTED' } }, required: ['outcome'] }, then: { properties: { final: { type: 'null' } } } },
    { if: { properties: { outcome: { enum: ['ACCEPTED', 'EDITED'] } }, required: ['outcome'] }, then: { properties: { final: { type: 'object' } } } },
  ],
};

export const termProposalSchema = {
  $schema: D7,
  $id: ids.termProposal,
  title: 'TermProposal',
  description: 'The "propose new term" path: creates a glossary/vocabulary request for owner approval instead of letting a model invent labels.',
  type: 'object',
  additionalProperties: false,
  required: ['term', 'kind', 'definition', 'justification', 'proposedBy', 'ts'],
  properties: {
    term: str,
    kind: { enum: [...TERM_KINDS] },
    definition: str,
    justification: str,
    proposedBy: str,
    ts: { type: 'string', format: 'date-time' },
  },
};

export const completeJsonRequestSchema = {
  $schema: D7,
  $id: ids.completeJsonRequest,
  title: 'CompleteJsonRequest',
  type: 'object',
  additionalProperties: false,
  required: ['prompt', 'schema'],
  properties: {
    prompt: str,
    schema: { type: 'object' },
    temperature: { type: 'number', minimum: 0, maximum: 2, default: 0 },
    seed: { type: 'integer' },
    maxTokens: { type: 'integer', minimum: 1 },
  },
};

export const completeJsonResponseSchema = {
  $schema: D7,
  $id: ids.completeJsonResponse,
  title: 'CompleteJsonResponse',
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'value', 'model'],
      properties: {
        ok: { const: true },
        value: {},
        model: str,
        usage: {
          type: 'object',
          additionalProperties: false,
          properties: { inputTokens: { type: 'integer' }, outputTokens: { type: 'integer' }, latencyMs: { type: 'number' } },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['ok', 'error'],
      properties: {
        ok: { const: false },
        error: {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'message'],
          properties: { code: { enum: [...ADAPTER_ERROR_CODES] }, message: str },
        },
      },
    },
  ],
};

// ---- MCP tool contracts: seed / expand / drilldown ----
const nodeIdArray = { type: 'array', minItems: 1, maxItems: LIMITS.maxNodeIds, items: str };
const nodeShape = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type'],
  properties: { id: str, type: str, label: { type: 'string' }, score: { type: 'number' } },
};

export const toolSchemas = {
  seed: {
    input: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: str,
        limit: { type: 'integer', minimum: 1, maximum: LIMITS.maxSeedResults, default: 10 },
        domains: { type: 'array', items: str },
      },
    },
    output: {
      type: 'object',
      additionalProperties: false,
      required: ['nodes'],
      properties: { nodes: { type: 'array', items: nodeShape } },
    },
  },
  expand: {
    input: {
      type: 'object',
      additionalProperties: false,
      required: ['nodeIds'],
      properties: {
        nodeIds: nodeIdArray,
        hops: { type: 'integer', minimum: 1, maximum: LIMITS.maxHops, default: 1 },
        maxBranching: { type: 'integer', minimum: 1, maximum: LIMITS.maxBranching, default: 10 },
        minTier: { enum: [...TRUST_TIERS] },
        minConfidence: { type: 'number', minimum: 0, maximum: 1, default: 0 },
      },
    },
    output: {
      type: 'object',
      additionalProperties: false,
      required: ['nodes', 'edges', 'truncated'],
      properties: {
        nodes: { type: 'array', items: nodeShape },
        edges: { type: 'array', items: { $ref: ids.edge } },
        truncated: { type: 'boolean' },
      },
    },
  },
  drilldown: {
    input: {
      type: 'object',
      additionalProperties: false,
      required: ['nodeIds'],
      properties: {
        nodeIds: nodeIdArray,
        mode: { enum: ['cached', 'live'], default: 'cached' },
        fields: { type: 'array', items: str },
      },
    },
    output: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'source', 'content', 'stale'],
            properties: { id: str, source: { enum: ['index', 'live'] }, content: { type: 'object' }, stale: { type: 'boolean' } },
          },
        },
      },
    },
  },
};

export const allSchemas = [annotationSchema, edgeSchema, decisionSchema, termProposalSchema, completeJsonRequestSchema, completeJsonResponseSchema];
