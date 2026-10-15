import test from 'node:test';
import assert from 'node:assert/strict';
import { tierRank, compareTiers, strongestEdge, needsLiveVerification, reconcile } from '../src/trust.js';

const edge = (o) => ({ from: 'Order.customer', to: 'Customer', type: 'PURCHASED_BY', direction: 'FORWARD', tier: 'LM', confidence: 0.7, ...o });

test('OWNER outranks SCHEMA outranks USAGE outranks LM', () => {
  assert.ok(tierRank('OWNER') > tierRank('SCHEMA'));
  assert.ok(tierRank('SCHEMA') > tierRank('USAGE'));
  assert.ok(tierRank('USAGE') > tierRank('LM'));
  assert.ok(compareTiers('LM', 'OWNER') < 0);
  assert.throws(() => tierRank('NOPE'), RangeError);
});

test('strongestEdge prefers tier, then confidence', () => {
  const a = edge({ tier: 'LM', confidence: 0.99 });
  const b = edge({ tier: 'SCHEMA', confidence: 1 });
  const c = edge({ tier: 'LM', confidence: 0.5 });
  assert.equal(strongestEdge([a, c, b]), b);
  assert.equal(strongestEdge([c, a]), a);
  assert.equal(strongestEdge([]), undefined);
});

test('needsLiveVerification', () => {
  assert.equal(needsLiveVerification(edge({ tier: 'LM', confidence: 0.99 })), true);
  assert.equal(needsLiveVerification(edge({ tier: 'USAGE', confidence: 0.5 })), true);
  assert.equal(needsLiveVerification(edge({ tier: 'USAGE', confidence: 0.9 })), false);
  assert.equal(needsLiveVerification(edge({ tier: 'SCHEMA', confidence: 1 })), false);
});

test('reconcile: owner wins and disagreement is reported', () => {
  const owner = edge({ tier: 'OWNER', confidence: 1, type: 'SHIPPED_TO' });
  const lmDisagree = edge({ tier: 'LM', type: 'BILLED_TO' });
  const lmAgree = edge({ tier: 'LM', type: 'SHIPPED_TO', confidence: 0.6 });
  const other = edge({ from: 'Order.billTo', tier: 'LM' });
  const { edges, conflicts } = reconcile([lmDisagree, owner, lmAgree, other]);
  assert.ok(edges.includes(owner));
  assert.ok(edges.includes(lmAgree));
  assert.ok(edges.includes(other));
  assert.ok(!edges.includes(lmDisagree));
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].overridden, [lmDisagree]);
});
