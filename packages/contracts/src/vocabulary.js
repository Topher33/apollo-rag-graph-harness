// Controlled vocabulary. Single source of truth: schemas, directive SDL and tests derive from these lists.
// Extend only through the "propose new term" path (see termProposal schema) with owner approval.

export const VOCABULARY_VERSION = '0.1.0';

/** Relation types owners/agents may use in @relation. 'OTHER' is allowed on edges only (requires proposedTerm). */
export const RELATION_TYPES = Object.freeze([
  'PURCHASED_BY',
  'SHIPPED_TO',
  'BILLED_TO',
  'CONTAINS',
  'REFERENCES',
  'SUPPLIED_BY',
  'STOCKED_AT',
  'CATEGORIZED_AS',
  'OWNED_BY',
  'ASSOCIATED_WITH',
]);

/** Owner-declared strength classes. Numeric closeness is computed by the system, not hand-assigned. */
export const STRENGTH_CLASSES = Object.freeze(['IDENTITY', 'CONTAINMENT', 'REFERENCE', 'ASSOCIATION']);

/** Provenance trust tiers, highest trust first. */
export const TRUST_TIERS = Object.freeze(['OWNER', 'SCHEMA', 'USAGE', 'LM']);

export const DIRECTIONS = Object.freeze(['FORWARD', 'BACKWARD', 'BIDIRECTIONAL']);

export const DECISION_OUTCOMES = Object.freeze(['ACCEPTED', 'EDITED', 'REJECTED']);

export const TERM_KINDS = Object.freeze(['RELATION_TYPE', 'DOMAIN', 'GLOSSARY_TERM']);

export const ADAPTER_ERROR_CODES = Object.freeze(['INVALID_JSON', 'SCHEMA_MISMATCH', 'PROVIDER_ERROR', 'TIMEOUT']);

/** Hard caps enforced on retrieval tools (fan-out protection). */
export const LIMITS = Object.freeze({ maxHops: 2, maxBranching: 50, maxSeedResults: 50, maxNodeIds: 25 });
