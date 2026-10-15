// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import { parse } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';

/** Build an executable federated subgraph schema for one subgraph definition + dataset. */
export function buildSchema(def, data) {
  return buildSubgraphSchema({ typeDefs: parse(def.sdl), resolvers: def.createResolvers(data) });
}
