import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTIVE_SDL, renderDirectives } from '../src/directives.js';
import { RELATION_TYPES, STRENGTH_CLASSES } from '../src/vocabulary.js';

test('directive SDL lists every vocabulary entry', () => {
  for (const t of [...RELATION_TYPES, ...STRENGTH_CLASSES]) assert.ok(DIRECTIVE_SDL.includes(`  ${t}\n`), t);
  assert.match(DIRECTIVE_SDL, /directive @relation\(.*\) on FIELD_DEFINITION/);
  assert.match(DIRECTIVE_SDL, /directive @semantic\(.*\) on OBJECT \| FIELD_DEFINITION/);
});

test('renderDirectives renders relation and semantic', () => {
  const out = renderDirectives({
    target: { type: 'Order', field: 'customer' },
    relation: { type: 'PURCHASED_BY', strength: 'REFERENCE', owner: 'orders-team', reviewed: '2026-10-14' },
    semantic: { domain: 'billing', embed: true, term: 'Purchaser' },
  });
  assert.equal(
    out,
    '@relation(type: PURCHASED_BY, strength: REFERENCE, owner: "orders-team", reviewed: "2026-10-14") @semantic(domain: "billing", embed: true, term: "Purchaser")',
  );
});

test('relation needs a field; empty annotation rejected', () => {
  assert.throws(() => renderDirectives({ target: { type: 'Order' }, relation: { type: 'CONTAINS', strength: 'CONTAINMENT' } }), TypeError);
  assert.throws(() => renderDirectives({ target: { type: 'Order' } }), TypeError);
  assert.equal(renderDirectives({ target: { type: 'Order' }, semantic: { domain: 'sales' } }), '@semantic(domain: "sales")');
});
