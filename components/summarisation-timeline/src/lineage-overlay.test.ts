import { describe, it, expect } from 'vitest';
import { computeBezierPath, computeAnchorPoint } from './lineage-overlay.js';

describe('computeAnchorPoint', () => {
  it('computes centre for L1 dots', () => {
    const rect = { left: 100, top: 50, width: 8, height: 8 } as DOMRect;
    const svgRect = { left: 0, top: 0 } as DOMRect;
    const point = computeAnchorPoint(rect, svgRect, 'l1', 'outgoing');
    expect(point.x).toBe(104);
    expect(point.y).toBe(54);
  });

  it('computes top-centre for L2 incoming', () => {
    const rect = { left: 50, top: 80, width: 100, height: 30 } as DOMRect;
    const svgRect = { left: 0, top: 0 } as DOMRect;
    const point = computeAnchorPoint(rect, svgRect, 'l2', 'incoming');
    expect(point.x).toBe(100);
    expect(point.y).toBe(80);
  });

  it('computes bottom-centre for L2 outgoing', () => {
    const rect = { left: 50, top: 80, width: 100, height: 30 } as DOMRect;
    const svgRect = { left: 0, top: 0 } as DOMRect;
    const point = computeAnchorPoint(rect, svgRect, 'l2', 'outgoing');
    expect(point.x).toBe(100);
    expect(point.y).toBe(110);
  });

  it('adjusts for SVG container offset', () => {
    const rect = { left: 150, top: 100, width: 8, height: 8 } as DOMRect;
    const svgRect = { left: 50, top: 30 } as DOMRect;
    const point = computeAnchorPoint(rect, svgRect, 'l1', 'outgoing');
    expect(point.x).toBe(104);
    expect(point.y).toBe(74);
  });
});

describe('computeBezierPath', () => {
  it('generates a cubic bezier SVG path string', () => {
    const path = computeBezierPath({ x: 100, y: 50 }, { x: 200, y: 150 });
    expect(path).toMatch(/^M 100 50 C/);
    expect(path).toContain('200 150');
  });

  it('handles same-height points', () => {
    const path = computeBezierPath({ x: 50, y: 100 }, { x: 200, y: 100 });
    expect(path).toMatch(/^M 50 100 C/);
    expect(path).toContain('200 100');
  });
});
