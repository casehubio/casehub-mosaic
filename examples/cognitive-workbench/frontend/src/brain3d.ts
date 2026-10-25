const BRAIN_REGION_COLORS: Record<string, string> = {
  social: '#f472b6', executive: '#34d399', episodic: '#60a5fa',
  semantic: '#fb923c', habitual: '#fb7185', judgment: '#a78bfa',
  categorical: '#6b7280', normative: '#c084fc', limbic: '#fbbf24',
};

let _brainGraph: any = null;
let _brainMeshObj: any = null;
let _cachedBrainData: BrainResponse | null = null;
let _brainHighlightedNodeId: string | null = null;
let _brainHighlightedNeighborIds: Set<string> = new Set();
let _brainScale = 1.0;

type BrainViewState = 'BRAIN_IDLE' | 'ZOOMING_IN' | 'EGO_ACTIVE' | 'ZOOMING_OUT';
let _brainViewState: BrainViewState = 'BRAIN_IDLE';
let _brainSavedCameraPos: any = null;
let _brainLastClickTime = 0;
let _brainLastClickNodeId: string | null = null;

function brainNodeColor(node: BrainNode): string {
  if (node.id.startsWith('_outline-')) return 'rgba(0, 0, 0, 0)';
  if (_brainHighlightedNodeId) {
    if (node.id === _brainHighlightedNodeId) return '#facc15';
    if (_brainHighlightedNeighborIds.has(node.id)) {
      if (!isBrainRegionActive(node.regionId)) return 'rgba(100, 116, 139, 0.15)';
      return BRAIN_REGION_COLORS[node.regionId] || '#6b7280';
    }
    return 'rgba(100, 116, 139, 0.2)';
  }
  if (!isBrainRegionActive(node.regionId)) return 'rgba(100, 116, 139, 0.15)';
  return BRAIN_REGION_COLORS[node.regionId] || '#6b7280';
}

function brainLinkColor(link: any): string {
  if (link.type === 'outline') return 'rgba(99, 102, 241, 0.2)';
  const src = typeof link.source === 'object' ? link.source.id : link.source;
  const tgt = typeof link.target === 'object' ? link.target.id : link.target;
  if (_brainHighlightedNodeId) {
    if (src === _brainHighlightedNodeId || tgt === _brainHighlightedNodeId) return 'rgba(250, 204, 21, 0.8)';
    return 'rgba(100, 116, 139, 0.08)';
  }
  if (link.linkType === 'caps') return 'rgba(148, 163, 184, 0.25)';
  if (link.linkType === 'affect') return 'rgba(251, 191, 36, 0.4)';
  return 'rgba(100, 116, 139, 0.35)';
}

function brainNodeSize(node: BrainNode): number {
  if (node.id.startsWith('_outline-')) return 0.01;
  if (node.nodeType === 'caps') return 1;
  if (node.nodeType === 'mood' || node.nodeType === 'affect') return 1.5;
  return 1.5 + (node.confidenceValue ?? 0.8) * 2;
}

function initBrain(): void {
  const container = document.getElementById('brainArea');
  if (!container || _brainGraph) return;

  _brainGraph = ForceGraph3D({ controlType: 'orbit' })(container)
    .width(container.clientWidth)
    .height(container.clientHeight)
    .backgroundColor('#0f1117')
    .nodeColor(function(node: any) { return brainNodeColor(node); })
    .nodeVal(function(node: any) { var s = brainNodeSize(node); return s * s; })
    .nodeLabel(function(node: any) { return node.name || node.id; })
    .nodeOpacity(0.85)
    .linkColor(function(link: any) { return brainLinkColor(link); })
    .linkWidth(function(link: any) { if (link.type === 'outline') return 0.5; return link.linkType === 'caps' ? 0.5 : 1; })
    .linkOpacity(0.6)
    .linkDirectionalArrowLength(3)
    .linkDirectionalArrowRelPos(1)
    .onNodeClick(function(node: any) {
      if (node.id && node.id.startsWith('_outline-')) return;
      var now = Date.now();
      if (_brainLastClickNodeId === node.id && now - _brainLastClickTime < 300) {
        _brainLastClickTime = 0;
        _brainLastClickNodeId = null;
        if (node.nodeType === 'entity') focusBrainNode(node.id);
        return;
      }
      _brainLastClickTime = now;
      _brainLastClickNodeId = node.id;

      _brainHighlightedNodeId = node.id;
      _brainHighlightedNeighborIds = new Set();
      var gd = _brainGraph.graphData();
      for (var i = 0; i < gd.links.length; i++) {
        var lnk = gd.links[i];
        var s = typeof lnk.source === 'object' ? lnk.source.id : lnk.source;
        var t = typeof lnk.target === 'object' ? lnk.target.id : lnk.target;
        if (s === node.id) _brainHighlightedNeighborIds.add(t);
        if (t === node.id) _brainHighlightedNeighborIds.add(s);
      }
      _brainGraph.nodeColor(function(n: any) { return brainNodeColor(n); })
        .linkColor(function(l: any) { return brainLinkColor(l); });
      selectNode(node.id);
    })
    .onBackgroundClick(function() {
      _brainHighlightedNodeId = null;
      _brainHighlightedNeighborIds = new Set();
      _brainGraph.nodeColor(function(n: any) { return brainNodeColor(n); })
        .linkColor(function(l: any) { return brainLinkColor(l); });
    })
    .enableNodeDrag(false)
    .warmupTicks(120)
    .cooldownTicks(400);

  _brainGraph.d3Force('charge').strength(-250).distanceMax(800);
  _brainGraph.d3Force('link').distance(50);

  new ResizeObserver(function() {
    if (_brainGraph) _brainGraph.width(container.clientWidth).height(container.clientHeight);
  }).observe(container);
}

async function loadBrainView(): Promise<void> {
  if (!_brainGraph) return;

  var response = await fetchBrainData();
  if (!response) return;
  _cachedBrainData = response;

  var result = toBrainGraph(response);
  var nodes = result.nodes;
  var links = result.links;

  currentNodes = response.regions.flatMap(function(r) { return r.nodes; });
  currentEdges = response.edges;

  var regionCounts = new Map<string, number>();
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    regionCounts.set(n.regionId, (regionCounts.get(n.regionId) || 0) + 1);
  }
  _brainScale = computeScale(regionCounts, 35);
  var scaledMesh = createBrainMesh(_brainScale);

  initBrainRegions(response.regions, scaledMesh.regionBounds);

  for (var j = 0; j < nodes.length; j++) {
    var node = nodes[j];
    var rb = scaledMesh.regionBounds.get(node.regionId);
    if (rb) {
      var xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
      for (var pi = 0; pi < rb.planes.length; pi++) {
        var pl = rb.planes[pi];
        if (pl.normal.x > 0.9) xMax = pl.offset;
        if (pl.normal.x < -0.9) xMin = -pl.offset;
        if (pl.normal.y > 0.9) yMax = pl.offset;
        if (pl.normal.y < -0.9) yMin = -pl.offset;
        if (pl.normal.z > 0.9) zMax = pl.offset;
        if (pl.normal.z < -0.9) zMin = -pl.offset;
      }
      var erx = 52 * _brainScale, ery = 48 * _brainScale, erz = 62 * _brainScale;
      var ecy = 2 * _brainScale, ecz = 2 * _brainScale;
      var attempts = 0;
      do {
        node.x = xMin + Math.random() * (xMax - xMin);
        node.y = yMin + Math.random() * (yMax - yMin);
        node.z = zMin + Math.random() * (zMax - zMin);
        var enx = node.x / erx, eny = (node.y - ecy) / ery, enz = (node.z - ecz) / erz;
        attempts++;
      } while (enx * enx + eny * eny + enz * enz > 0.9 && attempts < 20);
    }
  }

  addBrainOutlineNodes(scaledMesh, nodes, links);
  _brainGraph.d3Force('region', makeRegionContainmentForce(scaledMesh.regionBounds, _brainScale));
  _brainGraph.graphData({ nodes: nodes, links: links });
  _brainGraph.cameraPosition({ x: 80 * _brainScale, y: 60 * _brainScale, z: 250 * _brainScale }, { x: 0, y: 0, z: 0 }, 0);

  renderBrainPillFilters();

  var statsEl = document.getElementById('brainStats');
  if (statsEl) statsEl.textContent = nodes.length + ' nodes, ' + links.length + ' edges';
}

function addBrainOutlineNodes(meshData: BrainMesh, nodes: any[], links: BrainLink[]): void {
  var verts = meshData.vertices;
  for (var vi = 0; vi < verts.length; vi += 3) {
    nodes.push({
      id: '_outline-' + (vi / 3),
      name: '',
      regionId: 'outline',
      nodeType: 'caps',
      x: verts[vi], y: verts[vi + 1], z: verts[vi + 2],
      fx: verts[vi], fy: verts[vi + 1], fz: verts[vi + 2],
    });
  }

  var indices = meshData.indices;
  var edgeSet = new Set<string>();
  for (var fi = 0; fi < indices.length; fi += 3) {
    var triEdges = [
      [indices[fi], indices[fi + 1]],
      [indices[fi + 1], indices[fi + 2]],
      [indices[fi + 2], indices[fi]],
    ];
    for (var ei = 0; ei < triEdges.length; ei++) {
      var a = Math.min(triEdges[ei][0], triEdges[ei][1]);
      var b = Math.max(triEdges[ei][0], triEdges[ei][1]);
      var key = a + '-' + b;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        links.push({
          source: '_outline-' + a, target: '_outline-' + b,
          type: 'outline', linkType: 'entity',
        });
      }
    }
  }
}

function makeRegionContainmentForce(regionBounds: Map<string, RegionBounds>, scale: number): any {
  var forceNodes: any[] = [];
  var rx = 52 * scale, ry = 48 * scale, rz = 62 * scale;
  var cy = 2 * scale, cz = 2 * scale;

  function force(alpha: number) {
    for (var i = 0; i < forceNodes.length; i++) {
      var node = forceNodes[i];
      if (node.id && node.id.startsWith('_outline-')) continue;
      var px = node.x || 0, py = node.y || 0, pz = node.z || 0;

      var ex = px / rx, ey = (py - cy) / ry, ez = (pz - cz) / rz;
      var ellipDist = ex * ex + ey * ey + ez * ez;
      if (ellipDist > 1.0) {
        var sFactor = 0.5 + Math.min((ellipDist - 1.0) * 2, 0.5);
        node.vx = (node.vx || 0) - px * sFactor * alpha;
        node.vy = (node.vy || 0) - (py - cy) * sFactor * alpha;
        node.vz = (node.vz || 0) - (pz - cz) * sFactor * alpha;
        continue;
      }

      var bounds = regionBounds.get(node.regionId);
      if (!bounds) continue;
      var point = { x: px, y: py, z: pz };
      if (!isInsideRegion(point, bounds)) {
        var dx = bounds.center.x - px;
        var dy = bounds.center.y - py;
        var dz = bounds.center.z - pz;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        var strength = 0.3 + Math.min(dist / 50, 0.7);
        node.vx = (node.vx || 0) + dx * strength * alpha;
        node.vy = (node.vy || 0) + dy * strength * alpha;
        node.vz = (node.vz || 0) + dz * strength * alpha;
      }
    }
  }

  force.initialize = function(n: any[]) { forceNodes = n; };
  return force;
}

function renderBrainPillFilters(): void {
  var sidebar = document.getElementById('brainSidebar');
  if (!sidebar) return;

  var html = '<h2>Regions</h2>';
  var regions = allBrainRegions();
  for (var i = 0; i < regions.length; i++) {
    var region = regions[i];
    var color = BRAIN_REGION_COLORS[region.regionId] || '#6b7280';
    var activeClass = region.active ? ' active' : '';
    html += '<div class="brain-pill' + activeClass + '" onclick="toggleBrainFilter(\'' + region.regionId + '\')">'
      + '<span class="pill-dot" style="background:' + color + '"></span>'
      + '<div class="pill-text">'
      + '<span class="pill-label">' + region.functionalLabel + '</span>'
      + '<span class="pill-sub">' + region.anatomicalLabel + '</span>'
      + '</div>'
      + '<span class="badge">' + region.nodeCount + '</span>'
      + '</div>';
  }
  sidebar.innerHTML = html;
}

function toggleBrainFilter(regionId: string): void {
  toggleBrainRegion(regionId);
  renderBrainPillFilters();
  if (_brainGraph) {
    _brainGraph.nodeColor(function(n: any) { return brainNodeColor(n); })
      .linkColor(function(l: any) { return brainLinkColor(l); });
  }
}

function focusBrainNode(nodeId: string): void {
  if (_brainViewState !== 'BRAIN_IDLE' || !_brainGraph) return;
  _brainViewState = 'ZOOMING_IN';

  var gd = _brainGraph.graphData();
  var node = gd.nodes.find(function(n: any) { return n.id === nodeId; });
  if (!node) { _brainViewState = 'BRAIN_IDLE'; return; }

  var cam = _brainGraph.camera();
  _brainSavedCameraPos = {
    pos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
    lookAt: { x: 0, y: 0, z: 0 },
  };

  var zoomTarget = { x: node.x || 0, y: node.y || 0, z: (node.z || 0) + 100 };
  _brainGraph.cameraPosition(zoomTarget, { x: node.x || 0, y: node.y || 0, z: node.z || 0 }, 600);
  fadeBrainMesh(0.12, 0, 600);

  fetch('/api/workbench/ego/' + nodeId + '?depth=2&maxNodes=200')
    .then(function(r) { return r.json(); })
    .then(function(egoData: any) {
      if (egoData.error) throw new Error(egoData.error);
      setTimeout(function() {
        renderBrainEgo(egoData, nodeId);
        _brainViewState = 'EGO_ACTIVE';
        showBackToBrainButton(true);
      }, 650);
    })
    .catch(function() {
      if (_brainSavedCameraPos) {
        _brainGraph.cameraPosition(_brainSavedCameraPos.pos, _brainSavedCameraPos.lookAt, 400);
      }
      fadeBrainMesh(0, 0.12, 400);
      _brainViewState = 'BRAIN_IDLE';
    });
}

function renderBrainEgo(egoData: any, focusId: string): void {
  var nodes: any[] = egoData.nodes.map(function(n: any) {
    return {
      id: n.id, name: n.name, regionId: 'ego',
      nodeType: 'entity', subgraphType: n.subgraphType,
      confidenceValue: n.confidenceValue || 0.8,
      _isEgo: n.id === focusId,
      fx: n.id === focusId ? 0 : undefined,
      fy: n.id === focusId ? 0 : undefined,
      fz: n.id === focusId ? 0 : undefined,
    };
  });
  var links: any[] = egoData.edges.map(function(e: any) {
    return { source: e.sourceNodeId, target: e.targetNodeId, type: e.edgeType, linkType: 'entity' };
  });

  _brainGraph.d3Force('region', null);
  _brainGraph.d3Force('charge').strength(-60);

  _brainGraph.nodeColor(function(n: any) {
    if (n._isEgo) return '#facc15';
    return COLORS_3D[n.subgraphType?.toLowerCase()] || '#6b7280';
  });
  _brainGraph.linkColor(function() { return 'rgba(100, 116, 139, 0.4)'; });
  _brainGraph.graphData({ nodes: nodes, links: links });
  _brainGraph.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 400);

  currentNodes = egoData.nodes;
  currentEdges = egoData.edges;
}

function returnToBrain(): void {
  if (_brainViewState !== 'EGO_ACTIVE' || !_brainGraph) return;
  _brainViewState = 'ZOOMING_OUT';

  if (_brainSavedCameraPos) {
    _brainGraph.cameraPosition(_brainSavedCameraPos.pos, _brainSavedCameraPos.lookAt, 600);
  }
  fadeBrainMesh(0, 0.12, 600);

  setTimeout(function() {
    if (_cachedBrainData) {
      var result = toBrainGraph(_cachedBrainData);
      var scaledMesh = createBrainMesh(_brainScale);

      for (var j = 0; j < result.nodes.length; j++) {
        var nd = result.nodes[j];
        var rb = scaledMesh.regionBounds.get(nd.regionId);
        if (rb) {
          var jitter = _brainScale * 0.15;
          nd.x = rb.center.x + (Math.random() - 0.5) * jitter;
          nd.y = rb.center.y + (Math.random() - 0.5) * jitter;
          nd.z = rb.center.z + (Math.random() - 0.5) * jitter;
        }
      }

      _brainGraph.d3Force('region', makeRegionContainmentForce(scaledMesh.regionBounds, _brainScale));
      _brainGraph.d3Force('charge').strength(-40);
      _brainGraph.nodeColor(function(n: any) { return brainNodeColor(n); })
        .linkColor(function(l: any) { return brainLinkColor(l); });
      _brainGraph.graphData({ nodes: result.nodes, links: result.links });

      currentNodes = _cachedBrainData.regions.flatMap(function(r) { return r.nodes; });
      currentEdges = _cachedBrainData.edges;
    }

    _brainViewState = 'BRAIN_IDLE';
    _brainHighlightedNodeId = null;
    _brainHighlightedNeighborIds = new Set();
    showBackToBrainButton(false);
  }, 650);
}

function fadeBrainMesh(fromOpacity: number, toOpacity: number, duration: number): void {
  if (!_brainMeshObj || !_brainMeshObj.material) return;
  var start = performance.now();
  function step(time: number) {
    var progress = Math.min((time - start) / duration, 1);
    _brainMeshObj.material.opacity = fromOpacity + (toOpacity - fromOpacity) * progress;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showBackToBrainButton(show: boolean): void {
  var btn = document.getElementById('backToBrainBtn');
  if (btn) btn.style.display = show ? '' : 'none';
}
