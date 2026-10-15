import { TRUST_TIERS } from './vocabulary.js';

/** Higher number = more trusted. OWNER is highest. */
export function tierRank(tier) {
  const i = TRUST_TIERS.indexOf(tier);
  if (i < 0) throw new RangeError(`Unknown trust tier: ${tier}`);
  return TRUST_TIERS.length - i;
}

export function compareTiers(a, b) {
  return tierRank(a) - tierRank(b);
}

/** Pick the most trusted edge; ties broken by confidence. Returns undefined for an empty list. */
export function strongestEdge(edges) {
  let best;
  for (const e of edges) {
    if (!best) best = e;
    else {
      const d = compareTiers(e.tier, best.tier);
      if (d > 0 || (d === 0 && e.confidence > best.confidence)) best = e;
    }
  }
  return best;
}

/**
 * Whether an agent should verify this edge against the live API before reasoning deeply on it.
 * LM-inferred edges always need verification; USAGE edges below minConfidence do too.
 */
export function needsLiveVerification(edge, { minConfidence = 0.8 } = {}) {
  if (edge.tier === 'LM') return true;
  if (edge.tier === 'USAGE') return edge.confidence < minConfidence;
  return false;
}

/**
 * Apply "owner wins": for each (from,to) pair that has an OWNER edge, drop non-owner edges of a
 * different relation type and report the disagreement (worth logging: it often exposes a bad prompt or schema).
 * @returns {{edges: object[], conflicts: {from:string,to:string,owner:object,overridden:object[]}[]}}
 */
export function reconcile(edges) {
  const byPair = new Map();
  for (const e of edges) {
    const key = `${e.from}\u0000${e.to}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(e);
  }
  const out = [];
  const conflicts = [];
  for (const group of byPair.values()) {
    const owner = group.find((e) => e.tier === 'OWNER');
    if (!owner) {
      out.push(...group);
      continue;
    }
    const overridden = group.filter((e) => e !== owner && e.tier !== 'OWNER' && e.type !== owner.type);
    out.push(...group.filter((e) => !overridden.includes(e)));
    if (overridden.length) conflicts.push({ from: owner.from, to: owner.to, owner, overridden });
  }
  return { edges: out, conflicts };
}
