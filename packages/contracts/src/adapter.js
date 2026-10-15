// Model-adapter contract. Business logic never imports a vendor SDK; it talks to this interface.
//   complete(request)      -> { ok:true, value:string, model } | { ok:false, error }
//   completeJSON(request)  -> { ok:true, value:any, model }    | { ok:false, error }   (request validated by completeJsonRequest schema)
//   embed(texts[])         -> { ok:true, value:number[][], model } | { ok:false, error }

export const MODEL_ADAPTER_METHODS = Object.freeze(['complete', 'completeJSON', 'embed']);

export function assertModelAdapter(adapter) {
  if (!adapter || typeof adapter.name !== 'string' || !adapter.name) {
    throw new TypeError('ModelAdapter must have a non-empty string `name`');
  }
  for (const m of MODEL_ADAPTER_METHODS) {
    if (typeof adapter[m] !== 'function') throw new TypeError(`ModelAdapter "${adapter.name}" is missing method ${m}()`);
  }
  return adapter;
}

function hashVector(text, dim) {
  const v = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) v[i % dim] += text.charCodeAt(i) * (1 + (i % 7));
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/**
 * Deterministic adapter for tests and offline demos.
 * `json` is a queue of values (or functions of the request) returned by successive completeJSON calls.
 */
export function createMockAdapter({ name = 'mock', json = [], text = '', embedDim = 8 } = {}) {
  const queue = [...json];
  const calls = [];
  return {
    name,
    calls,
    async complete(request) {
      calls.push({ method: 'complete', request });
      return { ok: true, value: text, model: name };
    },
    async completeJSON(request) {
      calls.push({ method: 'completeJSON', request });
      if (!queue.length) return { ok: false, error: { code: 'PROVIDER_ERROR', message: 'mock adapter: no queued response' } };
      const next = queue.shift();
      return { ok: true, value: typeof next === 'function' ? next(request) : next, model: name };
    },
    async embed(texts) {
      calls.push({ method: 'embed', request: texts });
      return { ok: true, value: texts.map((t) => hashVector(String(t), embedDim)), model: name };
    },
  };
}
