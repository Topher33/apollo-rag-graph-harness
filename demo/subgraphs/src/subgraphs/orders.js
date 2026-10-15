// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
export const name = 'orders';
export const port = 4002;

// Deliberate semantic ambiguity for the proposer to work on: customer / shipTo / billTo all point at
// customer-owned entities, and Address.kind (customers subgraph) is free text.
export const sdl = `
extend schema @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

type Query {
  order(id: ID!): Order
  orders(limit: Int = 20, offset: Int = 0, status: String): [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  placedAt: String!
  status: String!
  customer: Customer!
  shipTo: Address
  billTo: Address
  lines: [OrderLine!]!
  total: Float!
}

type OrderLine {
  id: ID!
  product: Product!
  quantity: Int!
  unitPrice: Float!
}

# Contributes Customer.orders; resolvable so the router can fetch it from this subgraph.
type Customer @key(fields: "id") {
  id: ID!
  orders(limit: Int = 20): [Order!]!
}

type Address @key(fields: "id", resolvable: false) {
  id: ID!
}

type Product @key(fields: "sku", resolvable: false) {
  sku: ID!
}
`;

export function createResolvers(d) {
  return {
    Query: {
      order: (_, { id }) => d.orderById.get(id) ?? null,
      orders: (_, { limit, offset, status }) => {
        const o = Math.max(0, offset ?? 0);
        const l = Math.min(Math.max(1, limit ?? 20), 100);
        const rows = status ? d.orders.filter((x) => x.status === status) : d.orders;
        return rows.slice(o, o + l);
      },
    },
    Order: {
      __resolveReference: ({ id }) => d.orderById.get(id) ?? null,
      customer: (o) => ({ __typename: 'Customer', id: o.customerId }),
      shipTo: (o) => (o.shipToId ? { __typename: 'Address', id: o.shipToId } : null),
      billTo: (o) => (o.billToId ? { __typename: 'Address', id: o.billToId } : null),
      lines: (o) => d.linesByOrder.get(o.id) ?? [],
    },
    OrderLine: {
      product: (l) => ({ __typename: 'Product', sku: l.sku }),
    },
    Customer: {
      __resolveReference: ({ id }) => ({ id }),
      orders: (c, { limit }) => (d.ordersByCustomer.get(c.id) ?? []).slice(0, Math.min(Math.max(1, limit ?? 20), 100)),
    },
  };
}
