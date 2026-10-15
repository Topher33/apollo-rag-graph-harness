import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { isDeepStrictEqual } from 'node:util';
import { allSchemas, ids, toolSchemas } from './schemas.js';

// strict:'log' reports schema smells without throwing; useDefaults fills documented defaults (mutates input).
const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: 'log' });
addFormats(ajv);
for (const s of allSchemas) ajv.addSchema(s);

const fn = (id) => {
  const v = ajv.getSchema(id);
  if (!v) throw new Error(`schema not registered: ${id}`);
  return v;
};

const toolValidators = Object.fromEntries(
  Object.entries(toolSchemas).map(([name, { input, output }]) => [name, { input: ajv.compile(input), output: ajv.compile(output) }]),
);

function run(validateFn, data) {
  const valid = validateFn(data);
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validateFn.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`) };
}

export const validateAnnotation = (a) => run(fn(ids.annotation), a);
export const validateEdge = (e) => run(fn(ids.edge), e);
export const validateTermProposal = (t) => run(fn(ids.termProposal), t);
export const validateCompleteJsonRequest = (r) => run(fn(ids.completeJsonRequest), r);
export const validateCompleteJsonResponse = (r) => run(fn(ids.completeJsonResponse), r);

/** Schema check plus the cross-field rules JSON Schema cannot express. */
export function validateDecision(d) {
  const r = run(fn(ids.decision), d);
  if (!r.valid) return r;
  if (d.outcome === 'ACCEPTED' && !isDeepStrictEqual(d.proposed, d.final)) {
    return { valid: false, errors: ['ACCEPTED decisions must have final equal to proposed'] };
  }
  if (d.outcome === 'EDITED' && isDeepStrictEqual(d.proposed, d.final)) {
    return { valid: false, errors: ['EDITED decisions must have final different from proposed'] };
  }
  return r;
}

function tool(name) {
  const t = toolValidators[name];
  if (!t) throw new RangeError(`Unknown MCP tool: ${name}`);
  return t;
}
export const validateToolInput = (name, input) => run(tool(name).input, input);
export const validateToolOutput = (name, output) => run(tool(name).output, output);
