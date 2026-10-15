// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSchema } from './schema.js';

/** Express app serving one subgraph at /graphql with a /healthz probe. */
export async function createSubgraphApp(def, data) {
  const server = new ApolloServer({ schema: buildSchema(def, data) });
  await server.start();
  const app = express();
  app.get('/healthz', (_req, res) => res.json({ status: 'ok', subgraph: def.name }));
  app.use('/graphql', cors(), express.json(), expressMiddleware(server));
  return { app, server };
}
