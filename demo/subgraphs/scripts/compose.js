// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
// Composes the four subgraphs into a supergraph SDL for the Apollo Router (no rover binary needed).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'graphql';
import { composeServices } from '@apollo/composition';
import { SUBGRAPHS } from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? resolve(here, '../../../deploy/k8s/generated/supergraph.graphql'));
// In-cluster service DNS by default; override per subgraph with SUBGRAPH_URL_<NAME>.
const urlFor = (def) => process.env[`SUBGRAPH_URL_${def.name.toUpperCase()}`] ?? `http://${def.name}:${def.port}/graphql`;

const result = composeServices(Object.values(SUBGRAPHS).map((def) => ({ name: def.name, url: urlFor(def), typeDefs: parse(def.sdl) })));

if (result.errors?.length) {
  for (const e of result.errors) console.error(`composition error: ${e.message}`);
  process.exit(1);
}
for (const h of result.hints ?? []) console.log(`hint: ${h.message}`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, result.supergraphSdl);
console.log(`supergraph written to ${out}`);
