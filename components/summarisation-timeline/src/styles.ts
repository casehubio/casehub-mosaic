import { css } from 'lit';
import type { TimeRange } from '@casehubio/mosaic-core';

export const DEFAULT_CLASSIFICATION_PALETTE = [
  'oklch(0.65 0.12 0)',
  'oklch(0.65 0.12 60)',
  'oklch(0.65 0.12 120)',
  'oklch(0.65 0.12 180)',
  'oklch(0.65 0.12 240)',
  'oklch(0.65 0.12 300)',
];

export function classificationColour(
  classification: string,
  customColours: Record<string, string> | undefined,
  index: number,
): string {
  const custom = customColours?.[classification];
  if (custom) return custom;
  return DEFAULT_CLASSIFICATION_PALETTE[index % DEFAULT_CLASSIFICATION_PALETTE.length]!;
}

export function timestampToPixel(
  timestamp: number,
  visibleRange: TimeRange,
  containerWidth: number,
): number {
  const duration = visibleRange.to - visibleRange.from;
  if (duration <= 0) return 0;
  return ((timestamp - visibleRange.from) / duration) * containerWidth;
}

export function rangeToPixels(
  from: number,
  to: number,
  visibleRange: TimeRange,
  containerWidth: number,
): { left: number; width: number } {
  const left = timestampToPixel(from, visibleRange, containerWidth);
  const right = timestampToPixel(to, visibleRange, containerWidth);
  return { left, width: Math.max(right - left, 2) };
}

export function isPointVisible(timestamp: number, visibleRange: TimeRange): boolean {
  return timestamp >= visibleRange.from && timestamp <= visibleRange.to;
}

export function isRangeVisible(from: number, to: number, visibleRange: TimeRange): boolean {
  return from <= visibleRange.to && to >= visibleRange.from;
}

export const laneStyles = css`
  :host {
    display: block;
    position: relative;
    height: 2rem;
  }
  .lane-container {
    position: relative;
    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }
  .lane-container * {
    box-sizing: border-box;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
`;

export const timelineShellStyles = css`
  :host {
    display: block;
    position: relative;
    font-family: var(--pages-font-family, sans-serif);
    color: var(--pages-neutral-12, #1a1a1a);
  }
  .timeline-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
    position: relative;
  }
  .lanes-container {
    position: relative;
    overflow: hidden;
  }
  .svg-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }
  .svg-overlay path {
    pointer-events: stroke;
  }
  .loading-skeleton {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 1rem;
  }
  .skeleton-lane {
    height: 2rem;
    background: var(--pages-neutral-3, #eee);
    border-radius: 4px;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .skeleton-lane { animation: pulse 1.5s ease-in-out infinite; }
  .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--pages-neutral-9, #888);
    border: 1px solid var(--pages-neutral-4, #ddd);
    border-radius: 8px;
    margin: 1rem;
  }
  .error-state button {
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--pages-neutral-6, #aaa);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
  .lane-label {
    font-size: 10px;
    color: var(--pages-neutral-9, #888);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton-lane { animation: none; opacity: 0.8; }
    * { transition: none !important; animation: none !important; }
  }
`;
