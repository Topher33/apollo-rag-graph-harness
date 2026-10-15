export const name = 'customers';
export const port = 4001;

export const sdl = `
extend schema @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

type Query {
  customer(id: ID!): Customer
  customers(limit: Int = 20, offset: Int = 0): [Customer!]!
}

type Customer @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
  segment: String
  tier: String
  addresses: [Address!]!
}

type Address @key(fields: "id") {
  id: ID!
  line1: String!
  city: String!
  state: String!
  postalCode: String!
  kind: String
}
`;

const page = (limit, offset) => [Math.max(0, offset ?? 0), Math.min(Math.max(1, limit ?? 20), 100)];

export function createResolvers(d) {
  return {
    Query: {
      customer: (_, { id }) => d.customerById.get(id) ?? null,
      customers: (_, { limit, offset }) => {
        const [o, l] = page(limit, offset);
        return d.customers.slice(o, o + l);
      },
    },
    Customer: {
      __resolveReference: ({ id }) => d.customerById.get(id) ?? null,
      addresses: (c) => c.addressIds.map((id) => d.addressById.get(id)),
    },
    Address: {
      __resolveReference: ({ id }) => d.addressById.get(id) ?? null,
    },
  };
}
