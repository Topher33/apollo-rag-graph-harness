// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
export const name = 'catalog';
export const port = 4003;

export const sdl = `
extend schema @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

type Query {
  product(sku: ID!): Product
  products(limit: Int = 20, offset: Int = 0, category: String): [Product!]!
  categories: [Category!]!
  suppliers: [Supplier!]!
}

type Product @key(fields: "sku") {
  sku: ID!
  name: String!
  description: String
  price: Float!
  category: Category
  supplier: Supplier
}

type Category {
  id: ID!
  name: String!
  parent: Category
}

type Supplier {
  id: ID!
  name: String!
  country: String
  leadTimeDays: Int
}
`;

export function createResolvers(d) {
  return {
    Query: {
      product: (_, { sku }) => d.productBySku.get(sku) ?? null,
      products: (_, { limit, offset, category }) => {
        const o = Math.max(0, offset ?? 0);
        const l = Math.min(Math.max(1, limit ?? 20), 100);
        let rows = d.products;
        if (category) {
          const cat = d.categories.find((c) => c.id === category || c.name.toLowerCase() === category.toLowerCase());
          rows = cat ? rows.filter((p) => p.categoryId === cat.id) : [];
        }
        return rows.slice(o, o + l);
      },
      categories: () => d.categories,
      suppliers: () => d.suppliers,
    },
    Product: {
      __resolveReference: ({ sku }) => d.productBySku.get(sku) ?? null,
      category: (p) => d.categoryById.get(p.categoryId) ?? null,
      supplier: (p) => d.supplierById.get(p.supplierId) ?? null,
    },
    Category: {
      parent: (c) => (c.parentId ? d.categoryById.get(c.parentId) ?? null : null),
    },
  };
}
