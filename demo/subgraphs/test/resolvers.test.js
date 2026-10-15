// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
// Dependency-free: exercises resolver logic directly against the seed data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBGRAPHS, buildDataset } from '../src/index.js';

const d = buildDataset({ customers: 40, products: 30, orders: 80 });
const r = Object.fromEntries(Object.values(SUBGRAPHS).map((s) => [s.name, s.createResolvers(d)]));

test('every subgraph declares unique port, name, federation link and a Query type', () => {
  const ports = new Set();
  for (const s of Object.values(SUBGRAPHS)) {
    assert.ok(!ports.has(s.port));
    ports.add(s.port);
    assert.match(s.sdl, /@link\(url: "https:\/\/specs\.apollo\.dev\/federation\/v2\.5"/);
    assert.match(s.sdl, /type Query \{/);
    assert.equal((s.sdl.match(/\{/g) ?? []).length, (s.sdl.match(/\}/g) ?? []).length);
  }
});

test('customers: lookup, paging clamp, addresses', () => {
  const q = r.customers.Query;
  assert.equal(q.customer(null, { id: 'C-00001' }).id, 'C-00001');
  assert.equal(q.customer(null, { id: 'nope' }), null);
  assert.equal(q.customers(null, { limit: 5, offset: 0 }).length, 5);
  assert.equal(q.customers(null, { limit: 9999, offset: -4 }).length, 40);
  const c = d.customers[0];
  assert.equal(r.customers.Customer.addresses(c).length, c.addressIds.length);
  assert.equal(r.customers.Customer.__resolveReference({ id: c.id }), c);
});

test('orders: returns entity references for cross-subgraph fields', () => {
  const o = d.orders[0];
  const R = r.orders;
  assert.deepEqual(R.Order.customer(o), { __typename: 'Customer', id: o.customerId });
  assert.deepEqual(R.Order.shipTo(o), { __typename: 'Address', id: o.shipToId });
  assert.deepEqual(R.Order.billTo(o), { __typename: 'Address', id: o.billToId });
  const line = R.Order.lines(o)[0];
  assert.deepEqual(R.OrderLine.product(line), { __typename: 'Product', sku: line.sku });
  assert.deepEqual(R.Customer.__resolveReference({ id: 'x' }), { id: 'x' });
  assert.ok(R.Customer.orders({ id: o.customerId }, { limit: 50 }).some((x) => x.id === o.id));
  assert.ok(R.Query.orders(null, { limit: 1000, status: 'PAID' }).every((x) => x.status === 'PAID'));
});

test('catalog: category/supplier/parent resolution and category filter', () => {
  const R = r.catalog;
  const p = d.products[0];
  assert.equal(R.Product.category(p).id, p.categoryId);
  assert.equal(R.Product.supplier(p).id, p.supplierId);
  const child = d.categories.find((c) => c.parentId);
  assert.equal(R.Category.parent(child).id, child.parentId);
  assert.equal(R.Category.parent(d.categories[0]), null);
  const byName = R.Query.products(null, { limit: 100, category: d.categoryById.get(p.categoryId).name.toUpperCase() });
  assert.ok(byName.length >= 1 && byName.every((x) => x.categoryId === p.categoryId));
  assert.deepEqual(R.Query.products(null, { category: 'no-such-category' }), []);
});

test('inventory: availability = sum(quantity - reserved), never negative', () => {
  const R = r.inventory;
  for (const p of d.products) {
    const expected = d.stockBySku.get(p.sku).reduce((s, x) => s + (x.quantity - x.reserved), 0);
    assert.equal(R.Product.totalAvailable({ sku: p.sku }), expected);
    assert.ok(expected >= 0);
  }
  const s = d.stockLevels[0];
  assert.equal(R.StockLevel.warehouse(s).id, s.warehouseId);
  assert.deepEqual(R.Product.stock({ sku: 'unknown' }), []);
});
