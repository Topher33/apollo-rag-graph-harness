// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
// Needs dependencies installed (npm install at the repo root). Verifies composition and a cross-subgraph query
// end-to-end through an in-process gateway (no router/network needed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'graphql';
import { composeServices } from '@apollo/composition';
import { ApolloGateway, LocalGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { SUBGRAPHS, buildDataset } from '../src/index.js';
import { buildSchema } from '../src/schema.js';

const data = buildDataset({ customers: 60, products: 40, orders: 120 });
const compose = () =>
  composeServices(Object.values(SUBGRAPHS).map((d) => ({ name: d.name, url: `http://${d.name}:${d.port}/graphql`, typeDefs: parse(d.sdl) })));

test('supergraph composes without errors', () => {
  const r = compose();
  assert.deepEqual((r.errors ?? []).map((e) => e.message), []);
  assert.ok(r.supergraphSdl.includes('join__Graph'));
});

test('query spans customers, orders, catalog and inventory', async () => {
  const { supergraphSdl } = compose();
  const schemas = Object.fromEntries(Object.values(SUBGRAPHS).map((d) => [d.name, buildSchema(d, data)]));
  const gateway = new ApolloGateway({ supergraphSdl, buildService: ({ name }) => new LocalGraphQLDataSource(schemas[name]) });
  const server = new ApolloServer({ gateway });
  await server.start();
  try {
    const run = async (query, variables) => {
      const res = await server.executeOperation({ query, variables });
      assert.equal(res.body.kind, 'single');
      assert.equal(res.body.singleResult.errors, undefined, JSON.stringify(res.body.singleResult.errors));
      return res.body.singleResult.data;
    };

    const a = await run(`{ orders(limit: 3) { id status total
        customer { name email }
        shipTo { city state kind } billTo { city }
        lines { quantity unitPrice product { sku name category { name parent { name } } supplier { name } totalAvailable stock { quantity warehouse { name } } } } } }`);
    assert.equal(a.orders.length, 3);
    for (const o of a.orders) {
      assert.equal(typeof o.customer.name, 'string');
      assert.ok(o.shipTo.city);
      assert.ok(o.lines.length >= 1);
      for (const l of o.lines) {
        assert.equal(typeof l.product.name, 'string');
        assert.ok(Number.isInteger(l.product.totalAvailable) && l.product.totalAvailable >= 0);
        assert.ok(l.product.stock.length >= 2);
      }
    }

    const b = await run(`query($id: ID!) { customer(id: $id) { name addresses { id } orders(limit: 2) { id customer { id } } } }`, { id: 'C-00001' });
    assert.ok(b.customer.addresses.length >= 1);
    for (const o of b.customer.orders) assert.equal(o.customer.id, 'C-00001');
  } finally {
    await server.stop();
  }
});
