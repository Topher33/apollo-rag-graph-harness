// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
// Writes language-neutral artifacts (JSON Schemas + directive SDL) into ../schemas for non-JS consumers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSchemas, toolSchemas } from '../src/schemas.js';
import { DIRECTIVE_SDL } from '../src/directives.js';
import { VOCABULARY_VERSION } from '../src/vocabulary.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
mkdirSync(out, { recursive: true });
const write = (name, obj) => writeFileSync(join(out, name), JSON.stringify(obj, null, 2) + '\n');

for (const s of allSchemas) write(`${s.title.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase())}.schema.json`, s);
write('mcp-tools.schema.json', toolSchemas);
writeFileSync(join(out, 'directives.graphql'), DIRECTIVE_SDL);
writeFileSync(join(out, 'VERSION'), VOCABULARY_VERSION + '\n');
console.log(`exported ${allSchemas.length + 1} schemas + directives.graphql to ${out}`);
