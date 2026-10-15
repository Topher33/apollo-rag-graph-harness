// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import { SUBGRAPHS, buildDataset } from './index.js';
import { createSubgraphApp } from './server.js';

const name = process.env.SUBGRAPH;
const def = SUBGRAPHS[name];
if (!def) {
  console.error(`SUBGRAPH must be one of: ${Object.keys(SUBGRAPHS).join(', ')} (got ${JSON.stringify(name)})`);
  process.exit(1);
}

const port = Number(process.env.PORT ?? def.port);
const data = buildDataset({ seed: Number(process.env.SEED ?? 42) });
const { app, server } = await createSubgraphApp(def, data);
const http = app.listen(port, '0.0.0.0', () => console.log(`[${def.name}] subgraph listening on :${port}/graphql (seed ${data.seed})`));

const shutdown = async () => {
  http.close();
  await server.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
