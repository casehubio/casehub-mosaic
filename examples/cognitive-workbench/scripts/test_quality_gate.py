"""Tests for quality_gate.py — mechanical checks."""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from quality_gate import (
    check_orphans, check_vocabulary_compliance, check_edge_distribution,
    check_cooccurrence_coverage, run_mechanical_checks, FlagType
)


def test_check_orphans_flags_unconnected_entities():
    entities = [
        {'name': 'Frida Kahlo', 'type': 'person'},
        {'name': 'Surrealism', 'type': 'concept'},
    ]
    edges = [{'source': 'Frida Kahlo', 'target': 'Diego Rivera', 'type': 'married-to'}]
    standalone = []
    flags = check_orphans(entities, edges, standalone)
    assert len(flags) == 1
    assert flags[0].entity == 'Surrealism'
    assert flags[0].flag_type == FlagType.ORPHAN


def test_check_orphans_accepts_justified_standalone():
    entities = [
        {'name': 'Frida Kahlo', 'type': 'person'},
        {'name': 'Surrealism', 'type': 'concept'},
    ]
    edges = [{'source': 'Frida Kahlo', 'target': 'Diego Rivera', 'type': 'married-to'}]
    standalone = [{'entity': 'Surrealism', 'reason': 'Background context'}]
    flags = check_orphans(entities, edges, standalone)
    assert len(flags) == 0


def test_check_vocabulary_compliance_flags_unknown_types():
    edges = [
        {'source': 'A', 'target': 'B', 'type': 'married-to', 'validation_tier': 'REGISTERED'},
        {'source': 'C', 'target': 'D', 'type': 'invented-by', 'validation_tier': 'UNVALIDATED'},
    ]
    flags = check_vocabulary_compliance(edges)
    assert len(flags) == 1
    assert flags[0].flag_type == FlagType.VOCABULARY_VIOLATION


def test_check_vocabulary_compliance_passes_registered():
    edges = [
        {'source': 'A', 'target': 'B', 'type': 'married-to', 'validation_tier': 'REGISTERED'},
        {'source': 'C', 'target': 'D', 'type': 'pursues', 'validation_tier': 'REGISTERED'},
    ]
    flags = check_vocabulary_compliance(edges)
    assert len(flags) == 0


def test_check_edge_distribution_flags_concentration():
    edges = [{'source': f'A{i}', 'target': f'B{i}', 'type': 'married-to'} for i in range(10)]
    flags = check_edge_distribution(edges, max_concentration=0.4)
    assert len(flags) == 1
    assert flags[0].flag_type == FlagType.TYPE_CONCENTRATION


def test_check_edge_distribution_passes_balanced():
    edges = [
        {'source': 'A', 'target': 'B', 'type': 'married-to'},
        {'source': 'C', 'target': 'D', 'type': 'inspired-by'},
        {'source': 'E', 'target': 'F', 'type': 'pursues'},
    ]
    flags = check_edge_distribution(edges, max_concentration=0.4)
    assert len(flags) == 0


def test_check_cooccurrence_coverage_flags_missing_pairs():
    entities = [
        {'name': 'Frida Kahlo'},
        {'name': 'Diego Rivera'},
        {'name': 'Surrealism'},
    ]
    edges = [{'source': 'Frida Kahlo', 'target': 'Diego Rivera', 'type': 'married-to'}]
    flags = check_cooccurrence_coverage(entities, edges)
    assert len(flags) == 2


def test_run_mechanical_checks_combines_all():
    result = {
        'entities': [{'name': 'A'}, {'name': 'B'}, {'name': 'C'}],
        'edges': [{'source': 'A', 'target': 'B', 'type': 'married-to'}],
        'standalone': [],
    }
    flags = run_mechanical_checks(result)
    orphans = [f for f in flags if f.flag_type == FlagType.ORPHAN]
    bridges = [f for f in flags if f.flag_type == FlagType.MISSING_BRIDGE]
    assert len(orphans) == 1
    assert orphans[0].entity == 'C'
    assert len(bridges) == 2
