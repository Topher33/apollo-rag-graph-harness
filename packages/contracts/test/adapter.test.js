// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertModelAdapter, createMockAdapter } from '../src/adapter.js';

test('assertModelAdapter accepts a complete adapter and rejects partial ones', () => {
  const a = createMockAdapter();
  assert.equal(assertModelAdapter(a), a);
  assert.throws(() => assertModelAdapter({ name: 'x', complete() {}, embed() {} }), /completeJSON/);
  assert.throws(() => assertModelAdapter({}), TypeError);
  assert.throws(() => assertModelAdapter(null), TypeError);
});

test('mock adapter returns queued JSON then a typed error', async () => {
  const a = createMockAdapter({ json: [{ x: 1 }, (req) => ({ echo: req.prompt })] });
  assert.deepEqual((await a.completeJSON({ prompt: 'p', schema: {} })).value, { x: 1 });
  assert.deepEqual((await a.completeJSON({ prompt: 'hello', schema: {} })).value, { echo: 'hello' });
  const r = await a.completeJSON({ prompt: 'p', schema: {} });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'PROVIDER_ERROR');
  assert.equal(a.calls.length, 3);
});

test('mock embeddings are deterministic and unit length', async () => {
  const a = createMockAdapter({ embedDim: 4 });
  const [v1] = (await a.embed(['order'])).value;
  const [v2] = (await a.embed(['order'])).value;
  assert.deepEqual(v1, v2);
  assert.ok(Math.abs(Math.hypot(...v1) - 1) < 1e-9);
});
