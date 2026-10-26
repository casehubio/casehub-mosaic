"""Tests for extract_structure.py — sequential extraction, prompt quality, and orphan closure."""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from extract_structure import detect_subject, close_goal_orphans


def test_edge_prompt_excludes_associated_with():
    """The EDGE_SYSTEM prompt must not include 'associated-with' as a type."""
    from extract_structure import EDGE_SYSTEM
    assert 'associated-with' not in EDGE_SYSTEM


def test_edge_prompt_includes_standalone_instruction():
    """The EDGE_SYSTEM prompt must instruct about standalone entities."""
    from extract_structure import EDGE_SYSTEM
    assert 'standalone' in EDGE_SYSTEM


def test_edge_prompt_includes_cross_type_instructions():
    """The EDGE_SYSTEM prompt must include cross-type relationship examples."""
    from extract_structure import EDGE_SYSTEM
    assert 'person→goal' in EDGE_SYSTEM or 'person→concept' in EDGE_SYSTEM


def test_edge_prompt_requires_exact_entity_names():
    """The EDGE_SYSTEM prompt must instruct use of exact entity names."""
    from extract_structure import EDGE_SYSTEM
    assert 'MUST match' in EDGE_SYSTEM


def test_extract_passage_passes_entity_names_to_edge_call():
    """The edge LLM call must receive extracted entity names, not just NLP candidates."""
    from unittest.mock import MagicMock
    calls = []

    def mock_call_llm(client, system, text, context, label):
        calls.append({'system': system, 'context': context, 'label': label})
        if label == 'entities':
            return {'entities': [{'name': 'Frida Kahlo', 'type': 'person'}]}
        if label == 'goals':
            return {'entities': [{'name': 'artistic independence', 'type': 'goal'}]}
        if label == 'edges':
            return {'edges': [], 'standalone': []}
        if label == 'memories':
            return {'memories': []}
        return {}

    import extract_structure
    original = extract_structure.call_llm
    extract_structure.call_llm = mock_call_llm
    try:
        client = MagicMock()
        passage = {'text': 'Frida Kahlo pursued artistic independence.'}
        candidates = [{'canonical': 'Frida Kahlo', 'type': 'PERSON', 'mentions': 3, 'depth_tier': '1'}]
        result = extract_structure.extract_passage(client, passage, candidates)

        edge_call = next(c for c in calls if c['label'] == 'edges')
        assert 'Frida Kahlo' in edge_call['context']
        assert 'artistic independence' in edge_call['context']
        assert 'standalone' in result
    finally:
        extract_structure.call_llm = original


def test_detect_subject_returns_most_referenced_person():
    entities = [
        {'name': 'Diego Rivera', 'type': 'person', 'source_passages': ['p-002']},
        {'name': 'Jane Doe', 'type': 'person', 'source_passages': ['p-001', 'p-002', 'p-003']},
        {'name': 'Surrealism', 'type': 'concept', 'source_passages': ['p-001', 'p-002', 'p-003', 'p-004']},
    ]
    assert detect_subject(entities) == 'Jane Doe'


def test_detect_subject_returns_none_without_persons():
    entities = [{'name': 'Surrealism', 'type': 'concept'}]
    assert detect_subject(entities) is None


def test_close_goal_orphans_links_unconnected_goals():
    entities = [
        {'name': 'Jane', 'type': 'person'},
        {'name': 'Artistic freedom', 'type': 'goal'},
        {'name': 'Financial independence', 'type': 'goal'},
    ]
    edges = [{'source': 'Jane', 'target': 'Artistic freedom', 'type': 'pursues'}]
    new_edges = close_goal_orphans(entities, edges, 'Jane')
    assert len(new_edges) == 1
    assert new_edges[0]['target'] == 'Financial independence'
    assert new_edges[0]['source'] == 'Jane'
    assert new_edges[0]['type'] == 'pursues'


def test_close_goal_orphans_skips_connected_goals():
    entities = [
        {'name': 'Jane', 'type': 'person'},
        {'name': 'Artistic freedom', 'type': 'goal'},
    ]
    edges = [{'source': 'Jane', 'target': 'Artistic freedom', 'type': 'pursues'}]
    new_edges = close_goal_orphans(entities, edges, 'Jane')
    assert len(new_edges) == 0


def test_close_goal_orphans_no_subject():
    entities = [{'name': 'Artistic freedom', 'type': 'goal'}]
    new_edges = close_goal_orphans(entities, [], None)
    assert len(new_edges) == 0
