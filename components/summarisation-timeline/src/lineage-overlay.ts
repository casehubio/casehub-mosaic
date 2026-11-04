import { svg } from 'lit';
import type { LineageIndex } from '@casehubio/mosaic-core';
import type { HoverState } from './types.js';

interface Point { x: number; y: number; }

type Lane = 'l1' | 'l2' | 'l3' | 'l4';
type Direction = 'incoming' | 'outgoing';

export function computeAnchorPoint(
  rect: DOMRect,
  svgRect: DOMRect,
  lane: Lane,
  direction: Direction,
): Point {
  const relLeft = rect.left - svgRect.left;
  const relTop = rect.top - svgRect.top;

  switch (lane) {
    case 'l1':
      return { x: relLeft + rect.width / 2, y: relTop + rect.height / 2 };
    case 'l2':
      return direction === 'incoming'
        ? { x: relLeft + rect.width / 2, y: relTop }
        : { x: relLeft + rect.width / 2, y: relTop + rect.height };
    case 'l3':
      return direction === 'incoming'
        ? { x: relLeft + rect.width / 2, y: relTop }
        : { x: relLeft + rect.width / 2, y: relTop + rect.height };
    case 'l4':
      return { x: relLeft + rect.width / 2, y: relTop };
  }
}

export function computeBezierPath(from: Point, to: Point): string {
  const controlOffset = Math.abs(to.y - from.y) * 0.4;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + controlOffset}, ${to.x} ${to.y - controlOffset}, ${to.x} ${to.y}`;
}

export interface LineagePath {
  sourceId: string;
  targetId: string;
  path: string;
  isHighlighted: boolean;
}

export function computeLineagePaths(
  lineageIndex: LineageIndex,
  hoverState: HoverState,
  highlightedIds: readonly string[],
  getElementRect: (id: string) => DOMRect | null,
  getElementLane: (id: string) => Lane | null,
  svgRect: DOMRect,
): LineagePath[] {
  const paths: LineagePath[] = [];
  const highlighted = new Set<string>();

  if (hoverState.eventId != null && hoverState.lane !== 'l4') {
    const hoverSet = new Set(highlightedIds);
    for (const id of hoverSet) {
      const upIds = lineageIndex.upward.get(id) ?? [];
      const downIds = lineageIndex.downward.get(id) ?? [];
      for (const targetId of upIds) highlighted.add(`${id}->${targetId}`);
      for (const sourceId of downIds) highlighted.add(`${sourceId}->${id}`);
    }
  }

  for (const [sourceId, targets] of lineageIndex.upward) {
    for (const targetId of targets) {
      const srcRect = getElementRect(sourceId);
      const tgtRect = getElementRect(targetId);
      const srcLane = getElementLane(sourceId);
      const tgtLane = getElementLane(targetId);
      if (!srcRect || !tgtRect || !srcLane || !tgtLane) continue;

      const from = computeAnchorPoint(srcRect, svgRect, srcLane, 'outgoing');
      const to = computeAnchorPoint(tgtRect, svgRect, tgtLane, 'incoming');
      const key = `${sourceId}->${targetId}`;

      paths.push({
        sourceId,
        targetId,
        path: computeBezierPath(from, to),
        isHighlighted: highlighted.has(key),
      });
    }
  }

  return paths;
}

export function renderLineageOverlay(paths: LineagePath[], hasHover: boolean) {
  return svg`
    ${paths.map(p => svg`
      <path
        d="${p.path}"
        fill="none"
        stroke="var(--pages-neutral-8, #777)"
        stroke-width="${p.isHighlighted ? 2 : 1}"
        stroke-dasharray="${p.isHighlighted ? 'none' : '4 2'}"
        opacity="${hasHover ? (p.isHighlighted ? 0.9 : 0.08) : 0.15}"
        style="transition: opacity 0.15s ease, stroke-width 0.15s ease;"
      />
    `)}
  `;
}
