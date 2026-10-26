"""Tests for chunk.py — subject detection and passage chunking."""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from chunk import detect_subject, chunk_markdown


def test_detect_subject_from_title():
    text = "# Frida Kahlo — Biographical Source Document\n\n## 1. Childhood\n\nSome text."
    assert detect_subject(text) == 'Frida Kahlo'


def test_detect_subject_strips_common_suffixes():
    text = "# Marie Curie — Biography\n\n## Early Life\n\nSome text."
    assert detect_subject(text) == 'Marie Curie'


def test_detect_subject_plain_title():
    text = "# Albert Einstein\n\n## Youth\n\nSome text."
    assert detect_subject(text) == 'Albert Einstein'


def test_detect_subject_from_filename():
    text = "No heading here, just text."
    assert detect_subject(text, 'marie-curie-biography.md') == 'Marie Curie Biography'


def test_detect_subject_empty():
    assert detect_subject('No heading', '') == ''


def test_chunk_markdown_produces_passages():
    text = "# Title\n\n## Section One\n\nFirst passage text.\n\n## Section Two\n\nSecond passage text."
    passages = chunk_markdown(text)
    assert len(passages) == 2
    assert passages[0]['section'] == 'Section One'
    assert passages[1]['section'] == 'Section Two'
