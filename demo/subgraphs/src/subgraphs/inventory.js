// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
export const name = 'inventory';
export const port = 4004;

export const sdl = `
extend schema @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

type Query {
  warehouses: [Warehouse!]!
  stockLevels(sku: ID!): [StockLevel!]!
}

# Contributes stock fields to Product (owned by catalog).
type Product @key(fields: "sku") {
  sku: ID!
  stock: [StockLevel!]!
  totalAvailable: Int!
}

type StockLevel {
  id: ID!
  warehouse: Warehouse!
  quantity: Int!
  reserved: Int!
}

type Warehouse {
  id: ID!
  name: String!
  region: String
}
`;

export function createResolvers(d) {
  const stock = (sku) => d.stockBySku.get(sku) ?? [];
  return {
    Query: {
      warehouses: () => d.warehouses,
      stockLevels: (_, { sku }) => stock(sku),
    },
    Product: {
      __resolveReference: ({ sku }) => ({ sku }),
      stock: (p) => stock(p.sku),
      totalAvailable: (p) => stock(p.sku).reduce((sum, s) => sum + Math.max(0, s.quantity - s.reserved), 0),
    },
    StockLevel: {
      warehouse: (s) => d.warehouseById.get(s.warehouseId),
    },
  };
}
