// Ambient type declarations for 3d-force-graph (loaded via CDN)

interface ForceGraph3DInstance {
  (container: HTMLElement): ForceGraph3DInstance;
  width(w: number): ForceGraph3DInstance;
  height(h: number): ForceGraph3DInstance;
  backgroundColor(color: string): ForceGraph3DInstance;
  nodeColor(fn: (node: Graph3DNode) => string): ForceGraph3DInstance;
  nodeVal(fn: (node: Graph3DNode) => number): ForceGraph3DInstance;
  nodeLabel(fn: (node: Graph3DNode) => string): ForceGraph3DInstance;
  nodeOpacity(val: number): ForceGraph3DInstance;
  nodeThreeObject(fn: ((node: Graph3DNode) => any) | null): ForceGraph3DInstance;
  linkColor(fn: (link: Graph3DLink) => string): ForceGraph3DInstance;
  linkWidth(fn: (link: Graph3DLink) => number): ForceGraph3DInstance;
  linkOpacity(val: number): ForceGraph3DInstance;
  linkDirectionalArrowLength(val: number): ForceGraph3DInstance;
  linkDirectionalArrowRelPos(val: number): ForceGraph3DInstance;
  linkDirectionalParticles(fn: (link: Graph3DLink) => number): ForceGraph3DInstance;
  linkDirectionalParticleSpeed(fn: (link: Graph3DLink) => number): ForceGraph3DInstance;
  linkDirectionalParticleWidth(fn: (link: Graph3DLink) => number): ForceGraph3DInstance;
  linkDirectionalParticleColor(fn: (link: Graph3DLink) => string | null): ForceGraph3DInstance;
  onNodeClick(fn: (node: Graph3DNode) => void): ForceGraph3DInstance;
  onBackgroundClick(fn: () => void): ForceGraph3DInstance;
  enableNodeDrag(val: boolean): ForceGraph3DInstance;
  warmupTicks(val: number): ForceGraph3DInstance;
  cooldownTicks(val: number): ForceGraph3DInstance;
  numDimensions(val: number): ForceGraph3DInstance;
  graphData(): { nodes: Graph3DNode[]; links: Graph3DLink[] };
  graphData(data: { nodes: Graph3DNode[]; links: Graph3DLink[] }): ForceGraph3DInstance;
  d3Force(name: string, force?: any): any;
  cameraPosition(pos: { x: number; y: number; z: number }, lookAt?: { x: number; y: number; z: number }, duration?: number): ForceGraph3DInstance;
  camera(): any;
  controls(): any;
  renderer(): { domElement: HTMLCanvasElement };
}

declare function ForceGraph3D(opts?: { controlType?: string }): ForceGraph3DInstance;

// d3 force API (exposed via 3d-force-graph)
declare namespace d3 {
  function forceRadial(radius: (node: Graph3DNode) => number): { strength(s: number): any };
}
