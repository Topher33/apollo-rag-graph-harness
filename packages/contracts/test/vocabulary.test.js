import test from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../src/vocabulary.js';

test('vocabularies have unique UPPER_SNAKE entries', () => {
  for (const list of [V.RELATION_TYPES, V.STRENGTH_CLASSES, V.TRUST_TIERS, V.DIRECTIONS, V.DECISION_OUTCOMES, V.TERM_KINDS, V.ADAPTER_ERROR_CODES]) {
    assert.equal(new Set(list).size, list.length);
    for (const t of list) assert.match(t, /^[A-Z][A-Z0-9_]*$/);
  }
});

test('trust tiers are ordered highest trust first', () => {
  assert.deepEqual([...V.TRUST_TIERS], ['OWNER', 'SCHEMA', 'USAGE', 'LM']);
});

test('vocabulary lists are frozen', () => {
  assert.ok(Object.isFrozen(V.RELATION_TYPES));
  assert.ok(Object.isFrozen(V.LIMITS));
});
