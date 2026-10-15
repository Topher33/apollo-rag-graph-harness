// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDataset, countEntities } from '../src/data.js';

const strip = (d) => JSON.stringify({ c: d.customers, o: d.orders, l: d.orderLines, s: d.stockLevels, p: d.products });

test('same seed => identical dataset; different seed => different', () => {
  assert.equal(strip(buildDataset({ seed: 7 })), strip(buildDataset({ seed: 7 })));
  assert.notEqual(strip(buildDataset({ seed: 7 })), strip(buildDataset({ seed: 8 })));
});

test('default dataset is a few thousand entities', () => {
  const n = countEntities(buildDataset());
  assert.ok(n >= 3000 && n <= 20000, `entity count ${n}`);
});

test('referential integrity', () => {
  const d = buildDataset({ customers: 80, products: 60, orders: 200 });
  for (const o of d.orders) {
    assert.ok(d.customerById.has(o.customerId));
    const ship = d.addressById.get(o.shipToId);
    const bill = d.addressById.get(o.billToId);
    assert.equal(ship.customerId, o.customerId);
    assert.equal(bill.customerId, o.customerId);
    assert.ok(d.linesByOrder.get(o.id).length >= 1);
    const sum = d.linesByOrder.get(o.id).reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    assert.ok(Math.abs(sum - o.total) < 0.011, `${o.id} total ${o.total} vs ${sum}`);
  }
  for (const l of d.orderLines) assert.ok(d.productBySku.has(l.sku));
  for (const p of d.products) {
    assert.ok(d.categoryById.has(p.categoryId));
    assert.ok(d.supplierById.has(p.supplierId));
    assert.ok(d.stockBySku.get(p.sku).length >= 2);
  }
  for (const s of d.stockLevels) {
    assert.ok(d.warehouseById.has(s.warehouseId));
    assert.ok(s.reserved <= s.quantity);
  }
  for (const c of d.categories) if (c.parentId) assert.ok(d.categoryById.has(c.parentId));
});

test('ids are unique per collection', () => {
  const d = buildDataset();
  for (const [name, rows] of Object.entries({ customers: d.customers, addresses: d.addresses, orders: d.orders, orderLines: d.orderLines, stock: d.stockLevels, products: d.products })) {
    assert.equal(new Set(rows.map((r) => r.id ?? r.sku)).size, rows.length, name);
  }
});
