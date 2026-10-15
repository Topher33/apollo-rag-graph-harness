// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import test from 'node:test';
import assert from 'node:assert/strict';
import { allSchemas, ids, toolSchemas, edgeSchema } from '../src/schemas.js';
import { RELATION_TYPES, LIMITS } from '../src/vocabulary.js';

test('every schema has a unique urn $id and a title', () => {
  const seen = new Set();
  for (const s of allSchemas) {
    assert.match(s.$id, /^urn:harness:schema:/);
    assert.ok(s.title);
    assert.ok(!seen.has(s.$id));
    seen.add(s.$id);
  }
  assert.equal(seen.size, Object.keys(ids).length);
});

test('edge type enum = vocabulary + OTHER', () => {
  assert.deepEqual(edgeSchema.properties.type.enum, [...RELATION_TYPES, 'OTHER']);
});

test('tool schemas enforce fan-out caps from LIMITS', () => {
  assert.equal(toolSchemas.expand.input.properties.hops.maximum, LIMITS.maxHops);
  assert.equal(toolSchemas.expand.input.properties.maxBranching.maximum, LIMITS.maxBranching);
  assert.equal(toolSchemas.seed.input.properties.limit.maximum, LIMITS.maxSeedResults);
  assert.deepEqual(Object.keys(toolSchemas), ['seed', 'expand', 'drilldown']);
});
