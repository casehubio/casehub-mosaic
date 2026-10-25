export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Plane {
  normal: Vec3;
  offset: number;
}

export interface RegionBounds {
  planes: Plane[];
  center: Vec3;
  color: string;
}

export interface BrainMesh {
  vertices: Float32Array;
  indices: Uint16Array;
  regionBounds: Map<string, RegionBounds>;
}

export const REGION_IDS = [
  'social', 'executive', 'episodic', 'semantic', 'habitual',
  'judgment', 'categorical', 'normative', 'limbic',
] as const;

export type RegionId = typeof REGION_IDS[number];

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-10) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function makeBox(
  minX: number, maxX: number,
  minY: number, maxY: number,
  minZ: number, maxZ: number,
  center: Vec3,
  color: string,
): RegionBounds {
  return {
    planes: [
      { normal: { x: 1, y: 0, z: 0 }, offset: maxX },
      { normal: { x: -1, y: 0, z: 0 }, offset: -minX },
      { normal: { x: 0, y: 1, z: 0 }, offset: maxY },
      { normal: { x: 0, y: -1, z: 0 }, offset: -minY },
      { normal: { x: 0, y: 0, z: 1 }, offset: maxZ },
      { normal: { x: 0, y: 0, z: -1 }, offset: -minZ },
    ],
    center,
    color,
  };
}

function buildRegionBounds(scale: number): Map<string, RegionBounds> {
  const s = scale;
  const regions = new Map<string, RegionBounds>();

  // Frontal regions (positive Z = front of brain)
  regions.set('executive', makeBox(
    -35 * s, 35 * s, 5 * s, 45 * s, 30 * s, 70 * s,
    { x: 0, y: 25 * s, z: 50 * s }, '#34d399'));

  regions.set('judgment', makeBox(
    -30 * s, 30 * s, 20 * s, 55 * s, 5 * s, 35 * s,
    { x: 0, y: 38 * s, z: 20 * s }, '#a78bfa'));

  regions.set('normative', makeBox(
    -25 * s, 25 * s, -25 * s, 10 * s, 25 * s, 60 * s,
    { x: 0, y: -8 * s, z: 42 * s }, '#c084fc'));

  // Temporal regions (lateral spread, excludes central core)
  regions.set('social', makeBox(
    -70 * s, 70 * s, -25 * s, 15 * s, -20 * s, 15 * s,
    { x: 45 * s, y: -5 * s, z: -2 * s }, '#f472b6'));

  regions.set('semantic', makeBox(
    -55 * s, 55 * s, -35 * s, 5 * s, 10 * s, 35 * s,
    { x: 35 * s, y: -15 * s, z: 22 * s }, '#fb923c'));

  // Medial temporal (below and mid)
  regions.set('episodic', makeBox(
    -40 * s, 40 * s, -50 * s, -20 * s, -15 * s, 20 * s,
    { x: 0, y: -35 * s, z: 2 * s }, '#60a5fa'));

  // Subcortical central (small, near origin, above episodic)
  regions.set('habitual', makeBox(
    -18 * s, 18 * s, -12 * s, 12 * s, -8 * s, 8 * s,
    { x: 0, y: 0, z: 0 }, '#fb7185'));

  // Deep central (offset below habitual to avoid nesting)
  regions.set('limbic', makeBox(
    -15 * s, 15 * s, -18 * s, -5 * s, -6 * s, 6 * s,
    { x: 0, y: -12 * s, z: 0 }, '#fbbf24'));

  // Posterior (cerebellum)
  regions.set('categorical', makeBox(
    -30 * s, 30 * s, -50 * s, -15 * s, -60 * s, -20 * s,
    { x: 0, y: -32 * s, z: -40 * s }, '#6b7280'));

  return regions;
}

// Low-poly brain silhouette — sagittal profile revolved bilaterally
function buildBrainVertices(scale: number): { vertices: Float32Array; indices: Uint16Array } {
  const s = scale;
  const verts: number[] = [];
  const faces: number[] = [];

  // Brain profile: define cross-sections along Z axis (front to back)
  // Each section is an ellipse (radiusX, radiusY) at a given Z, Y-offset
  const sections: Array<{ z: number; rx: number; ry: number; yOff: number }> = [
    { z: 65 * s, rx: 15 * s, ry: 20 * s, yOff: 15 * s },   // frontal tip
    { z: 50 * s, rx: 35 * s, ry: 35 * s, yOff: 10 * s },   // frontal lobe
    { z: 30 * s, rx: 50 * s, ry: 40 * s, yOff: 5 * s },    // pre-central
    { z: 10 * s, rx: 55 * s, ry: 42 * s, yOff: 2 * s },    // central
    { z: -10 * s, rx: 52 * s, ry: 40 * s, yOff: 0 },       // parietal
    { z: -30 * s, rx: 45 * s, ry: 38 * s, yOff: -5 * s },  // occipital
    { z: -50 * s, rx: 25 * s, ry: 30 * s, yOff: -15 * s }, // occipital tip
    { z: -60 * s, rx: 15 * s, ry: 20 * s, yOff: -25 * s }, // cerebellum
  ];

  const angularSteps = 10; // points per cross-section ring

  // Generate vertices for each cross-section
  for (const sec of sections) {
    for (let i = 0; i < angularSteps; i++) {
      const angle = (i / angularSteps) * Math.PI * 2;
      const x = Math.cos(angle) * sec.rx;
      const y = Math.sin(angle) * sec.ry + sec.yOff;
      verts.push(x, y, sec.z);
    }
  }

  // Generate faces connecting adjacent cross-sections
  for (let s_i = 0; s_i < sections.length - 1; s_i++) {
    const base1 = s_i * angularSteps;
    const base2 = (s_i + 1) * angularSteps;
    for (let i = 0; i < angularSteps; i++) {
      const next = (i + 1) % angularSteps;
      // Two triangles per quad
      faces.push(base1 + i, base2 + i, base2 + next);
      faces.push(base1 + i, base2 + next, base1 + next);
    }
  }

  // Cap the front (first section)
  const frontCenter = verts.length / 3;
  verts.push(0, sections[0].yOff, sections[0].z);
  for (let i = 0; i < angularSteps; i++) {
    const next = (i + 1) % angularSteps;
    faces.push(frontCenter, next, i);
  }

  // Cap the back (last section)
  const backCenter = verts.length / 3;
  const lastBase = (sections.length - 1) * angularSteps;
  verts.push(0, sections[sections.length - 1].yOff, sections[sections.length - 1].z);
  for (let i = 0; i < angularSteps; i++) {
    const next = (i + 1) % angularSteps;
    faces.push(backCenter, lastBase + i, lastBase + next);
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(faces),
  };
}

export function isInsideRegion(point: Vec3, region: RegionBounds): boolean {
  for (const plane of region.planes) {
    const dist = dot(plane.normal, point) - plane.offset;
    if (dist > 0) return false;
  }
  return true;
}

export function computeScale(regionNodeCounts: Map<string, number>, targetSpacing: number): number {
  if (regionNodeCounts.size === 0) return 1.0;

  let maxDensity = 0;
  const baseRegions = buildRegionBounds(1.0);

  for (const [regionId, count] of regionNodeCounts) {
    if (count === 0) continue;
    const bounds = baseRegions.get(regionId);
    if (!bounds) continue;

    // Estimate region volume from bounding planes (axis-aligned box approximation)
    let xMin = -Infinity, xMax = Infinity;
    let yMin = -Infinity, yMax = Infinity;
    let zMin = -Infinity, zMax = Infinity;
    for (const p of bounds.planes) {
      if (p.normal.x > 0.9) xMax = Math.min(xMax, p.offset);
      if (p.normal.x < -0.9) xMin = Math.max(xMin, -p.offset);
      if (p.normal.y > 0.9) yMax = Math.min(yMax, p.offset);
      if (p.normal.y < -0.9) yMin = Math.max(yMin, -p.offset);
      if (p.normal.z > 0.9) zMax = Math.min(zMax, p.offset);
      if (p.normal.z < -0.9) zMin = Math.max(zMin, -p.offset);
    }
    const volume = (xMax - xMin) * (yMax - yMin) * (zMax - zMin);
    if (volume > 0) {
      const density = count / volume;
      maxDensity = Math.max(maxDensity, density);
    }
  }

  if (maxDensity === 0) return 1.0;

  // Scale so the densest region has targetSpacing between nodes
  // density = count / volume, desired density = 1 / spacing^3
  const desiredDensity = 1 / (targetSpacing * targetSpacing * targetSpacing);
  const scaleFactor = Math.cbrt(maxDensity / desiredDensity);
  return Math.max(1.0, scaleFactor);
}

export function createBrainMesh(scale: number): BrainMesh {
  const { vertices, indices } = buildBrainVertices(scale);
  const regionBounds = buildRegionBounds(scale);
  return { vertices, indices, regionBounds };
}

if (typeof window !== 'undefined') {
  (window as any).createBrainMesh = createBrainMesh;
  (window as any).isInsideRegion = isInsideRegion;
  (window as any).computeScale = computeScale;
  (window as any).REGION_IDS = REGION_IDS;
}
