// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAnnotation, validateEdge, validateDecision, validateTermProposal,
  validateCompleteJsonRequest, validateToolInput, validateToolOutput,
} from '../src/validate.js';

const ts = '2026-10-14T20:00:00Z';
const annotation = { target: { type: 'Order', field: 'customer' }, relation: { type: 'PURCHASED_BY', strength: 'REFERENCE' } };
const lmEdge = {
  from: 'Order.customer', to: 'Customer', type: 'PURCHASED_BY', direction: 'FORWARD', tier: 'LM', confidence: 0.82,
  evidence: [{ source: 'orders.graphql', snippet: 'customer: Customer!' }],
  provenance: { ts, model: 'mock', promptVersion: 'p1' },
};

test('annotation: valid, defaults applied, relation needs a field, needs relation or semantic', () => {
  assert.equal(validateAnnotation(structuredClone(annotation)).valid, true);
  const sem = { target: { type: 'Order' }, semantic: { domain: 'sales' } };
  assert.equal(validateAnnotation(sem).valid, true);
  assert.equal(sem.semantic.embed, false);
  assert.equal(validateAnnotation({ target: { type: 'Order' }, relation: annotation.relation }).valid, false);
  assert.equal(validateAnnotation({ target: { type: 'Order' } }).valid, false);
  assert.equal(validateAnnotation({ ...annotation, relation: { type: 'MADE_UP', strength: 'REFERENCE' } }).valid, false);
});

test('edge: LM edges need evidence and model/prompt provenance', () => {
  assert.equal(validateEdge(structuredClone(lmEdge)).valid, true);
  assert.equal(validateEdge({ ...lmEdge, evidence: [] }).valid, false);
  const { evidence, ...noEvidence } = lmEdge;
  assert.equal(validateEdge(noEvidence).valid, false);
  assert.equal(validateEdge({ ...lmEdge, provenance: { ts } }).valid, false);
});

test('edge: SCHEMA/OWNER confidence must be 1; OTHER needs proposedTerm', () => {
  const schemaEdge = { ...lmEdge, tier: 'SCHEMA', confidence: 1, provenance: { ts } };
  assert.equal(validateEdge(schemaEdge).valid, true);
  assert.equal(validateEdge({ ...schemaEdge, confidence: 0.9 }).valid, false);
  assert.equal(validateEdge({ ...lmEdge, type: 'OTHER' }).valid, false);
  assert.equal(validateEdge({ ...lmEdge, type: 'OTHER', proposedTerm: 'FULFILLED_BY' }).valid, true);
  assert.equal(validateEdge({ ...lmEdge, confidence: 1.2 }).valid, false);
});

test('decision: outcome rules', () => {
  const base = { proposalId: 'p-1', reviewer: 'matt', ts, versions: { vocabulary: '0.1.0' } };
  const edited = { ...annotation, relation: { type: 'SHIPPED_TO', strength: 'REFERENCE' } };
  assert.equal(validateDecision({ ...base, proposed: annotation, final: structuredClone(annotation), outcome: 'ACCEPTED' }).valid, true);
  assert.equal(validateDecision({ ...base, proposed: annotation, final: edited, outcome: 'ACCEPTED' }).valid, false);
  assert.equal(validateDecision({ ...base, proposed: annotation, final: edited, outcome: 'EDITED' }).valid, true);
  assert.equal(validateDecision({ ...base, proposed: annotation, final: structuredClone(annotation), outcome: 'EDITED' }).valid, false);
  assert.equal(validateDecision({ ...base, proposed: annotation, final: null, outcome: 'REJECTED', comment: 'wrong relation' }).valid, true);
  assert.equal(validateDecision({ ...base, proposed: annotation, final: annotation, outcome: 'REJECTED' }).valid, false);
});

test('term proposal and adapter request', () => {
  assert.equal(validateTermProposal({ term: 'FULFILLED_BY', kind: 'RELATION_TYPE', definition: 'd', justification: 'j', proposedBy: 'agent', ts }).valid, true);
  assert.equal(validateTermProposal({ term: 'x' }).valid, false);
  const req = { prompt: 'p', schema: { type: 'object' } };
  assert.equal(validateCompleteJsonRequest(req).valid, true);
  assert.equal(req.temperature, 0);
});

test('tool contracts: defaults and fan-out caps', () => {
  const ok = { nodeIds: ['Order:O-1'] };
  assert.equal(validateToolInput('expand', ok).valid, true);
  assert.equal(ok.hops, 1);
  assert.equal(ok.maxBranching, 10);
  assert.equal(validateToolInput('expand', { nodeIds: ['a'], hops: 3 }).valid, false);
  assert.equal(validateToolInput('expand', { nodeIds: [] }).valid, false);
  assert.equal(validateToolInput('seed', { query: 'refunds', limit: 500 }).valid, false);
  const dd = { nodeIds: ['a'] };
  assert.equal(validateToolInput('drilldown', dd).valid, true);
  assert.equal(dd.mode, 'cached');
  assert.throws(() => validateToolInput('nope', {}), RangeError);
  assert.equal(validateToolOutput('expand', { nodes: [], edges: [structuredClone(lmEdge)], truncated: false }).valid, true);
  assert.equal(validateToolOutput('expand', { nodes: [], edges: [{ ...lmEdge, tier: 'NOPE' }], truncated: false }).valid, false);
});
