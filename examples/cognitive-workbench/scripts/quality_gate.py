#!/usr/bin/env python3
"""Quality gate for extraction output — mechanical checks + Haiku evaluation."""

import json
import sys
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from llm_client import create_client, model_id


class FlagType(Enum):
    ORPHAN = "orphan"
    VOCABULARY_VIOLATION = "vocabulary_violation"
    LOW_CONFIDENCE = "low_confidence"
    TYPE_CONCENTRATION = "type_concentration"
    MISSING_BRIDGE = "missing_bridge"


@dataclass
class QualityFlag:
    flag_type: FlagType
    entity: str = ""
    edge_type: str = ""
    detail: str = ""


REGISTERED_TYPES = {
    'child-of', 'sibling-of', 'parent-of',
    'married-to', 'affair-with', 'divorced-from',
    'treated-by', 'taught-by', 'championed', 'collaborated-with',
    'pursues', 'enables', 'blocks', 'requires', 'contributes-to', 'decomposes-into',
    'lives-at', 'located-in', 'at',
    'inspired-by', 'created-by', 'depicted-in',
    'embodies', 'exemplifies', 'contradicts', 'influenced-by',
    'participated', 'occasion',
    'preceded-by', 'concurrent-with', 'succeeded-by',
    'caused-by', 'resulted-in', 'motivated-by',
}


def check_orphans(entities, edges, standalone):
    """Flag entities with no edges and no standalone justification."""
    connected = set()
    for e in edges:
        connected.add(e.get('source', ''))
        connected.add(e.get('target', ''))
    justified = {s['entity'] for s in standalone}

    flags = []
    for ent in entities:
        name = ent['name']
        if name not in connected and name not in justified:
            flags.append(QualityFlag(FlagType.ORPHAN, entity=name,
                detail=f"Entity '{name}' has no edges and no standalone justification"))
    return flags


def check_vocabulary_compliance(edges):
    """Flag edges using unregistered types."""
    flags = []
    for e in edges:
        etype = e.get('type', '')
        tier = e.get('validation_tier', 'REGISTERED')
        if tier == 'UNVALIDATED' or etype not in REGISTERED_TYPES:
            flags.append(QualityFlag(FlagType.VOCABULARY_VIOLATION,
                edge_type=etype,
                detail=f"Edge type '{etype}' not in registered vocabulary"))
    return flags


def check_edge_distribution(edges, max_concentration=0.4):
    """Flag if any single edge type exceeds max_concentration of total edges."""
    if not edges:
        return []
    type_counts = {}
    for e in edges:
        t = e.get('type', 'unknown')
        type_counts[t] = type_counts.get(t, 0) + 1
    total = len(edges)
    flags = []
    for t, count in type_counts.items():
        if count / total > max_concentration:
            flags.append(QualityFlag(FlagType.TYPE_CONCENTRATION,
                edge_type=t,
                detail=f"Type '{t}' is {count}/{total} ({count/total:.0%}) of edges"))
    return flags


def check_cooccurrence_coverage(entities, edges):
    """Flag co-occurring entity pairs without edges."""
    connected_pairs = set()
    for e in edges:
        pair = tuple(sorted([e.get('source', ''), e.get('target', '')]))
        connected_pairs.add(pair)

    entity_names = [e['name'] for e in entities]
    flags = []
    for i, a in enumerate(entity_names):
        for b in entity_names[i+1:]:
            pair = tuple(sorted([a, b]))
            if pair not in connected_pairs:
                flags.append(QualityFlag(FlagType.MISSING_BRIDGE,
                    detail=f"Co-occurring pair ({a}, {b}) has no edge"))
    return flags


def run_mechanical_checks(passage_result):
    """Run all mechanical quality checks on a passage extraction result."""
    entities = passage_result.get('entities', [])
    edges = passage_result.get('edges', [])
    standalone = passage_result.get('standalone', [])

    flags = []
    flags.extend(check_orphans(entities, edges, standalone))
    flags.extend(check_vocabulary_compliance(edges))
    flags.extend(check_edge_distribution(edges))
    flags.extend(check_cooccurrence_coverage(entities, edges))
    return flags


HAIKU_ORPHAN_PROMPT = """You are evaluating a knowledge graph extraction quality issue.

Entity "{entity}" (type: {entity_type}) has no relationship edges in a biographical knowledge graph.
The graph also contains these entities: {other_entities}
{passage_section}
Available relationship types: {vocab}

Task: Determine the most likely relationship between "{entity}" and any of the other entities.
- If a relationship exists, respond with: {{"action": "add_edge", "source": "...", "target": "...", "type": "...", "confidence_origin": "INFERRED"}}
- If genuinely standalone, respond with: {{"action": "justify", "reason": "..."}}

Respond with JSON only."""


def evaluate_with_haiku(flags, passage_text, entities, client):
    """Run Haiku evaluation on flagged orphan items."""
    corrections = []
    justifications = []
    entity_names = [e['name'] for e in entities]
    entity_types = {e['name']: e.get('type', 'unknown') for e in entities}

    for flag in flags:
        if flag.flag_type != FlagType.ORPHAN:
            continue
        others = [n for n in entity_names if n != flag.entity]
        if not others:
            continue
        passage_section = f"\nPassage:\n{passage_text}" if passage_text else ""
        prompt = HAIKU_ORPHAN_PROMPT.format(
            entity=flag.entity,
            entity_type=entity_types.get(flag.entity, 'unknown'),
            other_entities=', '.join(others[:30]),
            passage_section=passage_section,
            vocab=', '.join(sorted(REGISTERED_TYPES)),
        )
        for attempt in range(2):
            try:
                response = client.messages.create(
                    model=model_id(),
                    max_tokens=256,
                    messages=[{'role': 'user', 'content': prompt}],
                )
                text = response.content[0].text
                start = text.find('{')
                end = text.rfind('}') + 1
                if start < 0 or end <= start:
                    print(f"    Warning: no JSON in quality gate response for '{flag.entity}'", file=sys.stderr)
                    continue
                result = json.loads(text[start:end])
                if result.get('action') == 'add_edge':
                    corrections.append(result)
                elif result.get('action') == 'justify':
                    justifications.append({
                        'entity': flag.entity,
                        'reason': result.get('reason', 'No reason given'),
                    })
                break
            except Exception as e:
                print(f"    Warning: quality gate failed for '{flag.entity}' (attempt {attempt+1}): {e}", file=sys.stderr)

    return corrections, justifications


def run_quality_gate(passage_result, passage_text, client=None):
    """Full quality gate: mechanical checks + optional Haiku evaluation."""
    flags = run_mechanical_checks(passage_result)
    if not flags or client is None:
        return passage_result, flags, [], []

    entities = passage_result.get('entities', [])
    corrections, justifications = evaluate_with_haiku(flags, passage_text, entities, client)

    if corrections:
        passage_result['edges'] = passage_result.get('edges', []) + corrections
    if justifications:
        passage_result['standalone'] = passage_result.get('standalone', []) + justifications

    return passage_result, flags, corrections, justifications
