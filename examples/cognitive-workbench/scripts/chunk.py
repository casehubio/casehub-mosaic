#!/usr/bin/env python3
"""Step 1: Chunk source biography into addressable passages with character offsets.

Input:  source markdown file
Output: passages.json — list of passages with IDs, text, offsets, section headers

Usage:
    python3 chunk.py <source.md> [--output passages.json]
"""

import argparse
import json
import os
import re
import sys


def detect_subject(text: str, source_path: str = '') -> str:
    """Detect the biographical subject from the source document.

    Tries: (1) first # heading, stripping common suffixes like
    " — Biographical Source Document", (2) filename without extension.
    """
    title_match = re.match(r'^#\s+(.+)$', text, re.MULTILINE)
    if title_match:
        title = title_match.group(1).strip()
        title = re.sub(r'\s*[—–-]\s*(Biographical|Biography|Source|Document).*$', '', title, flags=re.IGNORECASE)
        return title.strip()
    if source_path:
        name = re.sub(r'[-_]', ' ', os.path.splitext(os.path.basename(source_path))[0])
        return name.title()
    return ''


def chunk_markdown(text: str) -> list[dict]:
    """Split markdown by ## headers into passages with character offsets."""
    passages = []
    header_pattern = re.compile(r'^(#{1,3})\s+(.+)$', re.MULTILINE)

    matches = list(header_pattern.finditer(text))
    if not matches:
        passages.append({
            'id': 'p-001',
            'section': 'untitled',
            'level': 0,
            'text': text.strip(),
            'start': 0,
            'end': len(text),
            'char_count': len(text),
        })
        return passages

    for i, match in enumerate(matches):
        level = len(match.group(1))
        section = match.group(2).strip()
        start = match.end() + 1
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()

        if not body:
            continue

        passage_id = f'p-{len(passages) + 1:03d}'
        passages.append({
            'id': passage_id,
            'section': section,
            'level': level,
            'text': body,
            'start': start,
            'end': end,
            'char_count': len(body),
        })

    return passages


def main():
    parser = argparse.ArgumentParser(description='Chunk source biography into passages')
    parser.add_argument('source', help='Path to source markdown file')
    parser.add_argument('--output', '-o', default='passages.json', help='Output JSON file')
    args = parser.parse_args()

    with open(args.source, 'r') as f:
        text = f.read()

    passages = chunk_markdown(text)
    subject = detect_subject(text, args.source)

    stats = {
        'source_file': args.source,
        'total_passages': len(passages),
        'total_chars': sum(p['char_count'] for p in passages),
        'avg_chars': sum(p['char_count'] for p in passages) // max(len(passages), 1),
    }

    output = {'subject': subject, 'stats': stats, 'passages': passages}

    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Subject: {subject}")
    print(f"Chunked {stats['total_passages']} passages, {stats['total_chars']} chars total")
    print(f"Average passage: {stats['avg_chars']} chars")
    print(f"Output: {args.output}")


if __name__ == '__main__':
    main()
