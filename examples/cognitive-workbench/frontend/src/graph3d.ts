// 3D ego-centric graph view using 3d-force-graph (Three.js wrapper)

const COLORS_3D: Record<string, string> = {
  person: '#f472b6', goal: '#34d399', activity: '#60a5fa',
  place: '#fbbf24', project: '#a78bfa', organisation: '#94a3b8',
  concept: '#fb923c', research_area: '#2dd4bf', cultural: '#c084fc',
  general: '#6b7280', type_system: '#6b7280', cognitive: '#6b7280',
  behavioral: '#fb7185'
};

const CAPS_COLORS: Record<string, string> = { INPUT: '#38bdf8', MEDIATING: '#a78bfa', OUTPUT: '#f97316' };

let graph3d: ForceGraph3DInstance | null = null;
let currentEgoId3d: string | null = null;
let capsTopology: CapsTopologyDto | null = null;
let capsVisible = false;
let capsShowOrphans = false;
let capsLayoutMode: 'inner' | 'interleaved' = 'inner';
let lastClickTime3d = 0;
let lastClickNodeId3d: string | null = null;
let egoHistory3d: string[] = [];
let rootEgoId3d: string | null = null;
let selectedCapsId3d: string | null = null;
let focusedEntityId3d: string | null = null;
let panelNodeId3d: string | null = null;

function nodeColor3d(node: Graph3DNode): string {
  if (node.id === focusedEntityId3d) return '#facc15';
  if (node._highlighted) return 'rgba(255,255,255,0.5)';
  if (node._capsType) return (node.id === selectedCapsId3d) ? '#facc15' : (CAPS_COLORS[node._capsType] || '#6b7280');
  return COLORS_3D[node.subgraphType?.toLowerCase()] || '#6b7280';
}

function linkColor3d(link: Graph3DLink): string {
  if (link._focused) return '#facc15';
  if (link._synthetic) return 'rgba(99, 102, 241, 0.6)';
  if (link._capsEdge) return 'rgba(148, 163, 184, 0.3)';
  return 'rgba(100, 116, 139, 0.4)';
}

function linkWidth3d(link: Graph3DLink): number {
  if (link._focused) return 3;
  return link._synthetic ? 1.5 : (link._capsEdge ? 0.5 : 1);
}

function nodeSize3d(node: Graph3DNode): number {
  const base = 1.5 + (node.confidenceValue || 0.8) * 2;
  return node._isEgo ? base * 1.8 : (node._capsNode ? base * 0.5 : base);
}

function init3D(): void {
  const container = document.getElementById('graph3dArea');
  if (!container) return;

  graph3d = (window as any)._graph3d = ForceGraph3D({ controlType: 'orbit' })(container)
    .width(container.clientWidth)
    .height(container.clientHeight)
    .backgroundColor('#0f1117')
    .nodeColor(nodeColor3d)
    .nodeVal(function(node: Graph3DNode) { return nodeSize3d(node) * nodeSize3d(node); })
    .nodeLabel(function(node: Graph3DNode) { return node.name || node.id; })
    .nodeOpacity(0.85)
    .linkColor(linkColor3d)
    .linkWidth(linkWidth3d)
    .linkOpacity(0.6)
    .linkDirectionalArrowLength(3)
    .linkDirectionalArrowRelPos(1)
    .onNodeClick(function(node: Graph3DNode) {
      const now = Date.now();
      if (lastClickNodeId3d === node.id && now - lastClickTime3d < 300) {
        lastClickTime3d = 0;
        lastClickNodeId3d = null;
        if (!node._capsNode) reEgo3d(node.id);
        return;
      }
      lastClickTime3d = now;
      lastClickNodeId3d = node.id;
      clearCapsHighlight();
      if (node._capsNode) {
        showCapsNodeDetail(node);
      } else {
        panelNodeId3d = node.id;
        selectNode(node.id);
      }
    })
    .onBackgroundClick(function() { clearCapsHighlight(); })
    .enableNodeDrag(false)
    .warmupTicks(80)
    .cooldownTicks(150);

  graph3d.d3Force('charge').strength(-80).distanceMax(300);
  graph3d.d3Force('link').distance(40);

  new ResizeObserver(function() {
    if (graph3d) graph3d.width(container.clientWidth).height(container.clientHeight);
  }).observe(container);

  graph3d.controls().enableRotate = false;
  let _rotating = false, _lastX = 0, _lastY = 0;
  const _canvas = graph3d.renderer().domElement;
  const _Vec3 = graph3d.camera().position.constructor;

  _canvas.addEventListener('pointerdown', function(e: PointerEvent) {
    if (e.button === 0 && currentEgoId3d) {
      _rotating = true;
      _lastX = e.clientX;
      _lastY = e.clientY;
      graph3d!.controls().enabled = false;
    }
  });
  window.addEventListener('pointermove', function(e: PointerEvent) {
    if (!_rotating) return;
    const dx = e.clientX - _lastX, dy = e.clientY - _lastY;
    _lastX = e.clientX; _lastY = e.clientY;

    const speed = 0.005;
    const cam = graph3d!.camera(), ctrl = graph3d!.controls();
    const yAxis = new _Vec3(0, 1, 0);

    cam.position.applyAxisAngle(yAxis, dx * speed);
    ctrl.target.applyAxisAngle(yAxis, dx * speed);
    cam.up.applyAxisAngle(yAxis, dx * speed);

    const camDir = cam.position.clone().normalize();
    const right = new _Vec3().crossVectors(yAxis, camDir).normalize();
    if (right.lengthSq() > 0.0001) {
      const phi = Math.acos(Math.max(-1, Math.min(1, cam.position.y / cam.position.length())));
      let dphi = dy * speed;
      const newPhi = phi + dphi;
      if (newPhi < 0.1) dphi = 0.1 - phi;
      if (newPhi > Math.PI - 0.1) dphi = Math.PI - 0.1 - phi;
      if (Math.abs(dphi) > 0.0001) {
        cam.position.applyAxisAngle(right, dphi);
        ctrl.target.applyAxisAngle(right, dphi);
        cam.up.applyAxisAngle(right, dphi);
      }
    }
    cam.lookAt(ctrl.target);
  });
  window.addEventListener('pointerup', function(e: PointerEvent) {
    if (e.button === 0 && _rotating) {
      _rotating = false;
      graph3d!.controls().enabled = true;
    }
  });
}

async function load3DEgo(nodeId: string): Promise<void> {
  if (!graph3d) return;
  currentEgoId3d = nodeId;
  if (!rootEgoId3d) rootEgoId3d = nodeId;
  const data = await fetchJson<EgoData>('/ego/' + nodeId + '?depth=2&maxNodes=200');
  if (!data || data.error) return;

  renderEgoBreadcrumb();
  document.getElementById('ego3dStats')!.textContent = data.nodes.length + ' nodes, ' + data.edges.length + ' edges' + (data.capped ? ' (capped)' : '');

  if (typeof allSubgraphs !== 'undefined') {
    for (let i = 0; i < allSubgraphs.length; i++) {
      const sg = allSubgraphs[i];
      const count = data.nodes.filter(function(n: NodeDto) { return n.subgraphType && n.subgraphType.toLowerCase() === (sg.type || '').toLowerCase(); }).length;
      const el = document.getElementById('count-' + sg.id);
      if (el) el.textContent = String(count);
    }
  }

  currentNodes = data.nodes;
  currentEdges = data.edges;

  const nodes: Graph3DNode[] = data.nodes.map(n => ({
    id: n.id,
    name: n.name,
    subgraphType: n.subgraphType,
    confidenceValue: n.confidenceValue ?? 0.8,
    bfsDepth: n.bfsDepth ?? 0,
    _isEgo: n.id === nodeId,
    _capsNode: false,
    _emissive: 0.2,
    fx: n.id === nodeId ? 0 : undefined,
    fy: n.id === nodeId ? 0 : undefined,
    fz: n.id === nodeId ? 0 : undefined,
  }));
  const links: Graph3DLink[] = data.edges.map(e => ({
    source: e.sourceNodeId,
    target: e.targetNodeId,
    type: e.edgeType,
    id: e.id,
    _synthetic: false,
    _capsEdge: false,
  }));

  if (capsVisible) {
    await mergeCapsIntoGraph(nodes, links);
  } else {
    graph3d.graphData({ nodes, links });
  }

  graph3d.d3Force('radial', null);
  graph3d.d3Force('charge').strength(-60);
  setTimeout(() => {
    graph3d!.d3Force('radial', typeof d3 !== 'undefined' ? d3.forceRadial((node: Graph3DNode) => (node.bfsDepth || 0) * 50).strength(0.4) : null);
  }, 100);
  graph3d.cameraPosition({ x: 0, y: 0, z: 400 }, { x: 0, y: 0, z: 0 }, 0);
}

function reEgo3d(nodeId: string): void {
  const node = graph3d!.graphData().nodes.find(function(n: Graph3DNode) { return n.id === nodeId; });
  if (node) {
    graph3d!.cameraPosition(
      { x: node.x!, y: node.y!, z: node.z! + 200 },
      { x: node.x!, y: node.y!, z: node.z! },
      600
    );
    setTimeout(function() { navigateEgo3d(nodeId); }, 650);
  } else {
    navigateEgo3d(nodeId);
  }
}

function navigateEgo3d(nodeId: string): void {
  if (currentEgoId3d && currentEgoId3d !== nodeId) {
    egoHistory3d.push(currentEgoId3d);
  }
  load3DEgo(nodeId);
}

function egoBack3d(): void {
  if (egoHistory3d.length === 0) return;
  const prev = egoHistory3d.pop()!;
  load3DEgo(prev);
}

function egoResetRoot3d(): void {
  const root = rootEgoId3d || (window as any).subjectNodeId;
  if (!root || root === currentEgoId3d) return;
  egoHistory3d = [];
  load3DEgo(root);
}

function egoJumpTo3d(index: number): void {
  if (index < 0 || index >= egoHistory3d.length) return;
  const target = egoHistory3d[index];
  egoHistory3d = egoHistory3d.slice(0, index);
  load3DEgo(target);
}

function renderEgoBreadcrumb(): void {
  const container = document.getElementById('ego3dBreadcrumb');
  if (!container) return;
  let trail = egoHistory3d.map(function(id: string, i: number) {
    const name = globalNodeNames.get(id) || id;
    return '<a href="#" class="entity-link" onclick="egoJumpTo3d(' + i + ');return false">' + name + '</a>';
  });
  const currentName = globalNodeNames.get(currentEgoId3d!) || currentEgoId3d || '';
  if (trail.length > 3) {
    trail = ['...'].concat(trail.slice(-3));
  }
  trail.push('<strong>' + currentName + '</strong>');
  container.innerHTML = trail.join(' → ');

  const backBtn = document.getElementById('ego3dBack') as HTMLButtonElement | null;
  if (backBtn) backBtn.disabled = egoHistory3d.length === 0;
  const rootBtn = document.getElementById('ego3dRoot') as HTMLButtonElement | null;
  const root = rootEgoId3d || (window as any).subjectNodeId;
  if (rootBtn) rootBtn.disabled = !root || root === currentEgoId3d;
}

async function loadCapsTopology(): Promise<CapsTopologyDto | null> {
  if (capsTopology) return capsTopology;
  capsTopology = await fetchJson<CapsTopologyDto>('/caps-topology');
  return capsTopology;
}

async function mergeCapsIntoGraph(mindMapNodes: Graph3DNode[], mindMapLinks: Graph3DLink[]): Promise<void> {
  const topo = await loadCapsTopology();
  if (!topo || !topo.nodes) {
    graph3d!.graphData({ nodes: mindMapNodes, links: mindMapLinks });
    return;
  }

  const connectedCapsIds = new Set<string>();
  topo.connections.forEach(function(cc: CapsConnectionDto) { connectedCapsIds.add(cc.from); connectedCapsIds.add(cc.to); });
  const orphanCount = topo.nodes.filter((cn: CapsNodeDto) => !connectedCapsIds.has(cn.id)).length;
  const orphanBtn = document.getElementById('capsOrphanBtn');
  if (orphanBtn) {
    orphanBtn.textContent = (capsShowOrphans ? 'Hide' : 'Show') + ' orphans (' + orphanCount + ')';
    orphanBtn.style.display = capsVisible ? '' : 'none';
  }

  const capsNodes: Graph3DNode[] = topo.nodes.filter((cn: CapsNodeDto) => capsShowOrphans || connectedCapsIds.has(cn.id)).map((cn: CapsNodeDto) => ({
    id: 'caps-' + cn.id,
    name: cn.id,
    subgraphType: 'caps',
    _capsNode: true,
    _capsType: cn.type,
    _capsCategory: cn.category,
    confidenceValue: 0.6,
    bfsDepth: capsLayoutMode === 'inner' ? 0.3 : 1,
    _isEgo: false,
    _emissive: 0.15,
  }));
  const capsLinks: Graph3DLink[] = topo.connections.map((cc: CapsConnectionDto) => ({
    source: 'caps-' + cc.from,
    target: 'caps-' + cc.to,
    type: 'caps-connection',
    _synthetic: false,
    _capsEdge: true,
  }));

  const expLinks = await fetchJson<{ links: ExperienceLinkDto[] }>('/caps-experience-links');
  const syntheticLinks: Graph3DLink[] = [];
  if (expLinks && expLinks.links) {
    const nodeNameToId: Record<string, string> = {};
    mindMapNodes.forEach(function(n: Graph3DNode) { if (n.name) nodeNameToId[n.name.toLowerCase()] = n.id; });
    const capsNodeIds = new Set(capsNodes.map(function(n: Graph3DNode) { return n.id; }));
    expLinks.links.forEach(function(link: ExperienceLinkDto) {
      const entityId = nodeNameToId[link.entity];
      const capsId = 'caps-' + link.capsNodeId;
      if (entityId && capsNodeIds.has(capsId)) {
        syntheticLinks.push({ source: entityId, target: capsId, type: 'experience-activation', _synthetic: true, _capsEdge: false, _confidence: link.confidence, _memoryCount: link.memoryCount });
        connectedCapsIds.add(link.capsNodeId);
      }
    });
  }

  const finalCapsNodes: Graph3DNode[] = topo.nodes.filter((cn: CapsNodeDto) => capsShowOrphans || connectedCapsIds.has(cn.id)).map((cn: CapsNodeDto) => ({
    id: 'caps-' + cn.id, name: cn.id, subgraphType: 'caps', _capsNode: true, _capsType: cn.type,
    _capsCategory: cn.category, confidenceValue: 0.6, bfsDepth: capsLayoutMode === 'inner' ? 0.3 : 1,
    _isEgo: false, _emissive: 0.15,
  }));
  const finalOrphanCount = topo.nodes.filter((cn: CapsNodeDto) => !connectedCapsIds.has(cn.id)).length;
  if (orphanBtn) orphanBtn.textContent = (capsShowOrphans ? 'Hide' : 'Show') + ' orphans (' + finalOrphanCount + ')';

  const allNodes = [...mindMapNodes, ...finalCapsNodes];
  const allLinks = [...mindMapLinks, ...capsLinks, ...syntheticLinks];
  graph3d!.graphData({ nodes: allNodes, links: allLinks });

  applyLayoutMode();
}

function applyLayoutMode(): void {
  if (!graph3d || typeof d3 === 'undefined') return;
  if (capsLayoutMode === 'inner') {
    graph3d.d3Force('radial', d3.forceRadial((node: Graph3DNode) => {
      if (node._capsNode) return 20;
      return (node.bfsDepth || 1) * 50;
    }).strength(0.5));
  } else {
    graph3d.d3Force('radial', d3.forceRadial((node: Graph3DNode) => (node.bfsDepth || 0) * 50).strength(0.4));
  }
  graph3d.numDimensions(3);
}

let _panelLastClickId: string | null = null, _panelLastClickTime = 0;

function panelLinkClick(nodeId: string, event?: Event): void {
  if (event) event.preventDefault();
  const now = Date.now();
  if (_panelLastClickId === nodeId && now - _panelLastClickTime < 300) {
    _panelLastClickId = null;
    _panelLastClickTime = 0;
    const node = graph3d!.graphData().nodes.find(function(n: Graph3DNode) { return n.id === nodeId; });
    if (node) {
      clearCapsHighlight();
      if (node._capsNode) showCapsNodeDetail(node);
      else selectNode(node.id);
    }
    return;
  }
  _panelLastClickId = nodeId;
  _panelLastClickTime = now;
  highlightPanelLink(nodeId);
}

function highlightPanelLink(targetNodeId: string): void {
  const sourceId = selectedCapsId3d || panelNodeId3d;
  if (!sourceId) return;
  focusedEntityId3d = targetNodeId;
  graph3d!.graphData().nodes.forEach(function(n: Graph3DNode) { n._highlighted = false; });
  graph3d!.graphData().links.forEach(function(l: Graph3DLink) {
    const srcId = typeof l.source === 'object' ? l.source.id : l.source;
    const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
    l._focused = (srcId === targetNodeId && tgtId === sourceId) || (tgtId === targetNodeId && srcId === sourceId);
  });
  graph3d!.nodeColor(nodeColor3d).linkColor(linkColor3d).linkWidth(linkWidth3d);
}

function clearCapsHighlight(): void {
  selectedCapsId3d = null;
  focusedEntityId3d = null;
  panelNodeId3d = null;
  graph3d!.graphData().nodes.forEach(function(n: Graph3DNode) { n._highlighted = false; });
  graph3d!.graphData().links.forEach(function(l: Graph3DLink) { l._focused = false; });
  graph3d!.nodeColor(nodeColor3d).linkColor(linkColor3d).linkWidth(linkWidth3d);
}

function setCapsVisible(visible: boolean): void {
  capsVisible = visible;
  document.getElementById('capsToggleBtn')!.textContent = visible ? 'Hide CAPS' : 'Show CAPS';
  const orphanBtn = document.getElementById('capsOrphanBtn');
  if (orphanBtn) orphanBtn.style.display = visible ? '' : 'none';
  if (!visible) capsShowOrphans = false;
  if (currentEgoId3d) load3DEgo(currentEgoId3d);
}

function toggleCapsOrphans(): void {
  capsShowOrphans = !capsShowOrphans;
  if (currentEgoId3d) load3DEgo(currentEgoId3d);
}

function toggleCapsLayout(mode: 'inner' | 'interleaved'): void {
  capsLayoutMode = mode;
  document.querySelectorAll('.caps-layout-btn').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.mode === mode));
  if (capsVisible && graph3d) {
    applyLayoutMode();
    graph3d.numDimensions(3);
  }
}

function showCapsNodeDetail(node: Graph3DNode): void {
  const capsId = node.id.replace('caps-', '');
  const panel = document.getElementById('detailPanel')!;
  panel.className = 'detail-panel';

  selectedCapsId3d = node.id;
  panelNodeId3d = node.id;
  const connectedEntityIds = new Set<string>();
  const graphLinks = graph3d!.graphData().links;
  graphLinks.forEach(function(l: Graph3DLink) {
    const srcId = typeof l.source === 'object' ? l.source.id : l.source;
    const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
    if (srcId === node.id) connectedEntityIds.add(tgtId);
    if (tgtId === node.id) connectedEntityIds.add(srcId);
  });
  graph3d!.graphData().nodes.forEach(function(n: Graph3DNode) { n._highlighted = connectedEntityIds.has(n.id) && !n._capsNode; });
  graph3d!.nodeColor(nodeColor3d);

  const typeColor = CAPS_COLORS[node._capsType!] || '#6b7280';
  let h = '<div class="detail-header" style="border-left-color:' + typeColor + ';background:linear-gradient(90deg,' + typeColor + '11,transparent 40%)">';
  h += '<h3>' + capsId + '</h3>';
  h += '<span class="type-badge" style="background:' + typeColor + '22;color:' + typeColor + '">' + node._capsType + '</span>';
  if (node._capsCategory) h += ' <span class="type-badge">' + node._capsCategory + '</span>';
  h += '</div>';

  if (capsTopology) {
    const capsNode = capsTopology.nodes.find(function(n: CapsNodeDto) { return n.id === capsId; });
    if (capsNode) {
      if (capsNode.keywords && capsNode.keywords.length > 0) {
        h += '<div class="detail-section"><h4>Keywords</h4>';
        for (let ki = 0; ki < capsNode.keywords.length; ki++) h += '<span class="attr-tag" style="margin-right:4px">' + capsNode.keywords[ki] + '</span>';
        h += '</div>';
      }
      if (capsNode.sourceModels && capsNode.sourceModels.length > 0) {
        h += '<div class="detail-section"><h4>Source Models</h4>';
        for (let mi = 0; mi < capsNode.sourceModels.length; mi++) h += '<span class="attr-tag" style="margin-right:4px">' + capsNode.sourceModels[mi] + '</span>';
        h += '</div>';
      }
    }

    const linkedEntities: Array<{ id: string; name: string; confidence: number; memories: number }> = [];
    graphLinks.forEach(function(l: Graph3DLink) {
      if (!l._synthetic) return;
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (tgtId === node.id) {
        const srcNode = graph3d!.graphData().nodes.find(function(n: Graph3DNode) { return n.id === srcId; });
        if (srcNode) linkedEntities.push({ id: srcNode.id, name: srcNode.name, confidence: l._confidence || 0, memories: l._memoryCount || 0 });
      }
    });
    if (linkedEntities.length > 0) {
      linkedEntities.sort(function(a, b) { return (b.memories || 0) - (a.memories || 0); });
      h += '<div class="detail-section"><h4>Experience Links (' + linkedEntities.length + ')</h4>';
      for (let ei = 0; ei < linkedEntities.length; ei++) {
        const ent = linkedEntities[ei];
        const safeName = escapeAttr(ent.name);
        h += '<div class="edge-item" style="cursor:pointer" onclick="panelLinkClick(\'' + ent.id + '\', event)"><a href="#" class="entity-link" onclick="return false">' + safeName + '</a> <span class="attr-tag">' + ent.memories + ' memories</span></div>';
      }
      h += '</div>';
    }

    const connections = capsTopology.connections.filter(function(c: CapsConnectionDto) { return c.from === capsId || c.to === capsId; });
    if (connections.length > 0) {
      h += '<div class="detail-section"><h4>CAPS Connections (' + connections.length + ')</h4>';
      for (let ci = 0; ci < connections.length; ci++) {
        const c = connections[ci];
        const dir = c.from === capsId ? '→' : '←';
        const other = c.from === capsId ? c.to : c.from;
        h += '<div class="edge-item" style="cursor:pointer" onclick="panelLinkClick(\'caps-' + other + '\', event)"><span class="edge-type">' + (c.psychologicalSource || '') + '</span> ' + dir + ' <a href="#" class="entity-link" onclick="return false">' + other + '</a> <span class="attr-tag">w:' + c.weight.toFixed(2) + '</span></div>';
      }
      h += '</div>';
    }
  }

  panel.innerHTML = h;
}
