import { describe, it, expect } from 'vitest';
import { createBrainMesh, isInsideRegion, computeScale, REGION_IDS, type Vec3 } from './brain-mesh';

describe('BrainMesh', () => {
  it('creates mesh with 9 regions', () => {
    const mesh = createBrainMesh(1.0);
    expect(mesh.regionBounds.size).toBe(9);
    for (const id of REGION_IDS) {
      expect(mesh.regionBounds.has(id)).toBe(true);
    }
  });

  it('region centers are inside their own region', () => {
    const mesh = createBrainMesh(1.0);
    for (const [, region] of mesh.regionBounds) {
      expect(isInsideRegion(region.center, region)).toBe(true);
    }
  });

  it('non-adjacent region centers do not overlap', () => {
    const mesh = createBrainMesh(1.0);
    // Adjacent/nested regions may overlap spatially — the temporal-parietal
    // region wraps around subcortical structures. Region assignment is by
    // subgraph type, not spatial position, so overlap is acceptable.
    const adjacentPairs = new Set([
      'habitual:social', 'limbic:social', 'limbic:habitual',
    ]);
    for (const [id, region] of mesh.regionBounds) {
      for (const [otherId, otherRegion] of mesh.regionBounds) {
        if (id !== otherId && !adjacentPairs.has(`${id}:${otherId}`)) {
          expect(isInsideRegion(region.center, otherRegion)).toBe(false);
        }
      }
    }
  });

  it('scales uniformly based on densest region', () => {
    const counts = new Map<string, number>([['social', 50], ['executive', 10], ['episodic', 5]]);
    const scale = computeScale(counts, 35);
    expect(scale).toBeGreaterThan(1.0);
  });

  it('returns scale 1.0 for empty regions', () => {
    const counts = new Map<string, number>();
    const scale = computeScale(counts, 35);
    expect(scale).toBe(1.0);
  });

  it('has valid mesh geometry', () => {
    const mesh = createBrainMesh(1.0);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.vertices.length % 3).toBe(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.indices.length % 3).toBe(0);
  });

  it('scaling changes vertex positions proportionally', () => {
    const mesh1 = createBrainMesh(1.0);
    const mesh2 = createBrainMesh(2.0);
    expect(mesh2.vertices[0]).toBeCloseTo(mesh1.vertices[0] * 2, 5);
    expect(mesh2.vertices[1]).toBeCloseTo(mesh1.vertices[1] * 2, 5);
    expect(mesh2.vertices[2]).toBeCloseTo(mesh1.vertices[2] * 2, 5);
  });

  it('point outside all regions is detected', () => {
    const mesh = createBrainMesh(1.0);
    const farPoint: Vec3 = { x: 1000, y: 1000, z: 1000 };
    for (const [, region] of mesh.regionBounds) {
      expect(isInsideRegion(farPoint, region)).toBe(false);
    }
  });
});
