// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
import { RELATION_TYPES, STRENGTH_CLASSES } from './vocabulary.js';

/** SDL a subgraph includes so @relation / @semantic validate. Generated from the vocabulary. */
export const DIRECTIVE_SDL = `enum RelationType {
${RELATION_TYPES.map((t) => `  ${t}`).join('\n')}
}

enum Strength {
${STRENGTH_CLASSES.map((t) => `  ${t}`).join('\n')}
}

directive @relation(type: RelationType!, strength: Strength!, owner: String, reviewed: String) on FIELD_DEFINITION

directive @semantic(domain: String!, embed: Boolean = false, term: String) on OBJECT | FIELD_DEFINITION
`;

const q = (s) => JSON.stringify(s);

/**
 * Render an annotation as schema directives, e.g.
 *   @relation(type: PURCHASED_BY, strength: REFERENCE, owner: "orders") @semantic(domain: "billing", embed: true)
 * Throws if a relation has no target field (@relation is field-level only).
 */
export function renderDirectives(annotation) {
  const parts = [];
  const { relation, semantic, target } = annotation;
  if (relation) {
    if (!target?.field) throw new TypeError('@relation requires target.field (field-level directive)');
    const args = [`type: ${relation.type}`, `strength: ${relation.strength}`];
    if (relation.owner) args.push(`owner: ${q(relation.owner)}`);
    if (relation.reviewed) args.push(`reviewed: ${q(relation.reviewed)}`);
    parts.push(`@relation(${args.join(', ')})`);
  }
  if (semantic) {
    const args = [`domain: ${q(semantic.domain)}`];
    if (semantic.embed !== undefined) args.push(`embed: ${Boolean(semantic.embed)}`);
    if (semantic.term) args.push(`term: ${q(semantic.term)}`);
    parts.push(`@semantic(${args.join(', ')})`);
  }
  if (!parts.length) throw new TypeError('annotation has neither relation nor semantic');
  return parts.join(' ');
}
