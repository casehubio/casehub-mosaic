import { describe, it, expect } from 'vitest';
import { TimeAxisController } from './time-axis-controller.js';

const mockHost = {
  addController() {},
  removeController() {},
  requestUpdate() {},
  updateComplete: Promise.resolve(true),
};

describe('TimeAxisController', () => {
  it('initialises with full range as visible range', () => {
    const ctrl = new TimeAxisController(mockHost as any);
    ctrl.setEffectiveRange({ from: 0, to: 1000 });
    ctrl.setContainerWidth(500);
    expect(ctrl.visibleRange).toEqual({ from: 0, to: 1000 });
    expect(ctrl.pixelsPerMs).toBe(0.5);
  });

  it('zoomIn reduces visible range centred on midpoint', () => {
    const ctrl = new TimeAxisController(mockHost as any);
    ctrl.setEffectiveRange({ from: 0, to: 1000 });
    ctrl.setContainerWidth(500);
    ctrl.zoomIn();
    const range = ctrl.visibleRange;
    expect(range.to - range.from).toBeLessThan(1000);
    const mid = (range.from + range.to) / 2;
    expect(mid).toBeCloseTo(500, 0);
  });

  it('zoomOut expands visible range clamped to effective range', () => {
    const ctrl = new TimeAxisController(mockHost as any);
    ctrl.setEffectiveRange({ from: 0, to: 1000 });
    ctrl.setContainerWidth(500);
    ctrl.zoomIn();
    ctrl.zoomOut();
    expect(ctrl.visibleRange).toEqual({ from: 0, to: 1000 });
  });

  it('panLeft shifts visible range left', () => {
    const ctrl = new TimeAxisController(mockHost as any);
    ctrl.setEffectiveRange({ from: 0, to: 1000 });
    ctrl.setContainerWidth(500);
    ctrl.setBrush(200, 800);
    const before = ctrl.visibleRange.from;
    ctrl.panLeft();
    expect(ctrl.visibleRange.from).toBeLessThan(before);
  });

  it('setBrush updates visible range to brush extents', () => {
    const ctrl = new TimeAxisController(mockHost as any);
    ctrl.setEffectiveRange({ from: 0, to: 1000 });
    ctrl.setContainerWidth(500);
    ctrl.setBrush(200, 600);
    expect(ctrl.visibleRange).toEqual({ from: 200, to: 600 });
    expect(ctrl.pixelsPerMs).toBeCloseTo(500 / 400, 5);
  });

  it('clamps pan to effective range', () => {
    const ctrl = new TimeAxisController(mockHost as any);
    ctrl.setEffectiveRange({ from: 0, to: 1000 });
    ctrl.setContainerWidth(500);
    ctrl.setBrush(0, 200);
    ctrl.panLeft();
    expect(ctrl.visibleRange.from).toBeGreaterThanOrEqual(0);
  });
});
