let viewTransform: ViewTransform = { x: 0, y: 0, scale: 1 };

function deOverlapLabels(nodes: SimNode[]): void {
  const labels = nodes.map(n => ({
    id: n.id,
    x: n.x,
    y: n.labelY || (n.y + 32),
    w: n.name.length * 6.5,
    h: 14,
  }));
  for (let pass = 0; pass < 10; pass++) {
    let moved = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        const overlapX = (a.w / 2 + b.w / 2) - Math.abs(a.x - b.x);
        const overlapY = (a.h / 2 + b.h / 2) - Math.abs(a.y - b.y);
        if (overlapX > 0 && overlapY > 0) {
          const pushY = (a.h / 2 + b.h / 2 + 2) / 2;
          if (a.y <= b.y) { a.y -= pushY; b.y += pushY; }
          else { a.y += pushY; b.y -= pushY; }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  for (const l of labels) {
    const n = nodes.find(nd => nd.id === l.id);
    if (n) n.labelY = l.y;
  }
}

function shortenLine(x1: number, y1: number, x2: number, y2: number, r: number): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < r * 2) return { x1, y1, x2, y2 };
  const ux = dx / dist, uy = dy / dist;
  return { x1: x1 + ux * r, y1: y1 + uy * r, x2: x2 - ux * r, y2: y2 - uy * r };
}
let isPanning = false;
let panStart = { x: 0, y: 0 };

function setupPanZoom(): void {
  const area = document.getElementById('graphArea')!;
  const svg = document.getElementById('graphSvg')!;

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.1, Math.min(5, viewTransform.scale * factor));
    viewTransform.x = mx - (mx - viewTransform.x) * (newScale / viewTransform.scale);
    viewTransform.y = my - (my - viewTransform.y) * (newScale / viewTransform.scale);
    viewTransform.scale = newScale;
    applyTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.node')) return;
    isPanning = true; panStart = { x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y };
    area.classList.add('panning');
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    viewTransform.x = e.clientX - panStart.x;
    viewTransform.y = e.clientY - panStart.y;
    applyTransform();
  });
  window.addEventListener('mouseup', () => { isPanning = false; document.getElementById('graphArea')!.classList.remove('panning'); });
}

function applyTransform(): void {
  document.getElementById('graphGroup')!.setAttribute('transform',
    'translate('+viewTransform.x+','+viewTransform.y+') scale('+viewTransform.scale+')');
}

function renderGraph(): void {
  const svg = document.getElementById('graphSvg')!;
  const rect = svg.getBoundingClientRect();
  const w = rect.width || 800, h = rect.height || 600;
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  viewTransform = { x: 0, y: 0, scale: 1 };
  applyTransform();

  const spread = Math.min(w, h) * 0.4;
  const simNodes: SimNode[] = currentNodes.map((n, i) => {
    const angle = (i / currentNodes.length) * 2 * Math.PI;
    return {
      id: n.id, x: w/2 + Math.cos(angle) * spread, y: h/2 + Math.sin(angle) * spread,
      name: n.name, type: n.subgraphType, pleasure: n.pleasure ?? undefined, arousal: n.arousal ?? undefined, dominance: n.dominance ?? undefined,
      confidence: n.confidenceValue ?? 0.8,
    };
  });
  const simNodeById = new Map<string, SimNode>(simNodes.map(n => [n.id, n]));
  const simEdges: SimEdge[] = currentEdges
    .filter(e => simNodeById.has(e.sourceNodeId) && simNodeById.has(e.targetNodeId))
    .map(e => ({ source: simNodeById.get(e.sourceNodeId)!, target: simNodeById.get(e.targetNodeId)!, type: e.edgeType, id: e.id }));

  let nodeR = simNodes.length > 40 ? 10 : (simNodes.length > 20 ? 14 : 18);
  let fontSize = simNodes.length > 40 ? 10 : 12;
  const maxLabelChars = simNodes.length > 30 ? 45 : 60;
  for (let ti = 0; ti < simNodes.length; ti++) {
    if (simNodes[ti].name.length > maxLabelChars) {
      simNodes[ti]._displayName = simNodes[ti].name.substring(0, maxLabelChars - 1) + '…';
    }
  }

  const _isGridLayout = simEdges.length < simNodes.length * 1.0;

  if (_isGridLayout) {
    nodeR = 6;
    fontSize = 11;
    const itemH = 22;
    let colW = (maxLabelChars * fontSize * 0.55) + nodeR * 2 + 12;
    const cols = Math.max(1, Math.floor(w / colW));
    colW = w / cols;
    for (let gi = 0; gi < simNodes.length; gi++) {
      const col = gi % cols, row = Math.floor(gi / cols);
      simNodes[gi].x = col * colW + nodeR + 10;
      simNodes[gi].y = row * itemH + itemH;
    }
  } else {
    const minSep = 120;
    const idealLen = Math.max(200, minSep * 2);
    const center = { x: w/2, y: h/2 };
    for (let iter = 0; iter < 400; iter++) {
      const cooling = Math.max(0.01, 1 - iter / 400);
      for (let fi = 0; fi < simNodes.length; fi++) {
        for (let fj = fi+1; fj < simNodes.length; fj++) {
          const a = simNodes[fi], b = simNodes[fj];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 0.1);
          const force = dist < minSep ? (minSep - dist) * 2 : (idealLen * idealLen) / (dist * dist) * 20;
          const fx = (dx / dist) * force * cooling, fy = (dy / dist) * force * cooling;
          a.x -= fx; a.y -= fy; b.x += fx; b.y += fy;
        }
      }
      for (let ei2 = 0; ei2 < simEdges.length; ei2++) {
        const e2 = simEdges[ei2];
        const dx2 = e2.target.x - e2.source.x, dy2 = e2.target.y - e2.source.y;
        const dist2 = Math.max(Math.sqrt(dx2*dx2 + dy2*dy2), 1);
        if (dist2 > idealLen) {
          const f2 = (dist2 - idealLen) * 0.003 * cooling;
          e2.source.x += (dx2/dist2)*f2; e2.source.y += (dy2/dist2)*f2;
          e2.target.x -= (dx2/dist2)*f2; e2.target.y -= (dy2/dist2)*f2;
        }
      }
      for (let ci = 0; ci < simNodes.length; ci++) {
        simNodes[ci].x += (center.x - simNodes[ci].x) * 0.003 * cooling;
        simNodes[ci].y += (center.y - simNodes[ci].y) * 0.003 * cooling;
        simNodes[ci].x = Math.max(80, Math.min(w - 80, simNodes[ci].x));
        simNodes[ci].y = Math.max(60, Math.min(h - 60, simNodes[ci].y));
      }
    }
  }

  deOverlapLabels(simNodes);

  const textPad = fontSize + 6;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const _rightLabels = simNodes.length > 8;
  for (const n of simNodes) {
    const dn = n._displayName || n.name;
    const labelW = dn.length * (fontSize * 0.55);
    if (_rightLabels) {
      minX = Math.min(minX, n.x - nodeR);
      maxX = Math.max(maxX, n.x + nodeR + 4 + labelW);
      minY = Math.min(minY, n.y - nodeR);
      maxY = Math.max(maxY, n.y + nodeR);
    } else {
      minX = Math.min(minX, n.x - labelW / 2);
      maxX = Math.max(maxX, n.x + labelW / 2);
      minY = Math.min(minY, n.y - nodeR);
      const ly = n.labelY || (n.y + nodeR + textPad);
      maxY = Math.max(maxY, ly + fontSize);
    }
  }
  const bw = maxX - minX, bh = maxY - minY;
  const pad = 30;
  const scaleX = (w - pad * 2) / bw, scaleY = (h - pad * 2) / bh;
  const fitScale = Math.max(0.6, Math.min(scaleX, scaleY, 1.5));
  const cx2 = (minX + maxX) / 2, cy2 = (minY + maxY) / 2;
  viewTransform = { x: w / 2 - cx2 * fitScale, y: h / 2 - cy2 * fitScale, scale: fitScale };
  applyTransform();

  let s = '';
  for (const e of simEdges) {
    const ln = shortenLine(e.source.x, e.source.y, e.target.x, e.target.y, nodeR);
    const dx = ln.x2 - ln.x1, dy = ln.y2 - ln.y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sameCol = Math.abs(e.source.x - e.target.x) < 40;
    if (_isGridLayout && sameCol && dist > 30) {
      const arc = Math.min(dist * 0.4, 80);
      const mx = (ln.x1 + ln.x2) / 2 - arc, my = (ln.y1 + ln.y2) / 2;
      s += '<path class="edge" d="M'+ln.x1+','+ln.y1+' Q'+mx+','+my+' '+ln.x2+','+ln.y2+'" fill="none"/>';
      s += '<text class="edge-label" x="'+(mx - 4)+'" y="'+my+'" text-anchor="end">'+e.type+'</text>';
    } else {
      const mx2 = (e.source.x + e.target.x) / 2, my2 = (e.source.y + e.target.y) / 2;
      s += '<line class="edge" x1="'+ln.x1+'" y1="'+ln.y1+'" x2="'+ln.x2+'" y2="'+ln.y2+'"/>';
      s += '<text class="edge-label" x="'+mx2+'" y="'+(my2-4)+'" text-anchor="middle">'+e.type+'</text>';
    }
  }
  for (const n of simNodes) {
    const color = TYPE_COLORS[n.type?.toLowerCase()] || TYPE_COLORS.general;
    const opacity = 0.4 + (n.confidence * 0.6);
    const displayName = n._displayName || n.name;
    s += '<g class="node" data-id="'+n.id+'" onclick="selectNode(\''+n.id+'\')" ondblclick="openEgo(\''+n.id+'\')">';
    s += '<circle cx="'+n.x+'" cy="'+n.y+'" r="'+nodeR+'" fill="'+color+'" fill-opacity="'+opacity+'" stroke="'+color+'"/>';
    if (simNodes.length > 8) {
      s += '<text x="'+(n.x + nodeR + 4)+'" y="'+(n.y + fontSize * 0.35)+'" text-anchor="start" style="font-size:'+fontSize+'px">'+displayName+'</text>';
    } else {
      const ly = n.labelY || (n.y + nodeR + textPad);
      s += '<text x="'+n.x+'" y="'+ly+'" text-anchor="middle" style="font-size:'+fontSize+'px">'+displayName+'</text>';
    }
    s += '</g>';
  }
  document.getElementById('graphGroup')!.innerHTML = s;
}

// -- Cognitive dimension exploration --
async function exploreDimension(type: string, value: string): Promise<void> {
  const data = await fetchJson<DimensionResponse>('/entities-by-dimension/' + type + '/' + encodeURIComponent(value));
  if (!data || !data.entities || data.entities.length === 0) return;

  switchView('graph');
  document.getElementById('sidebar')!.style.display = 'none';
  document.getElementById('egoBar')!.style.display = '';
  const typeColors: Record<string, string> = { emotion: '#f87171', tendency: '#34d399', distortion: '#f97316' };
  const color = typeColors[type] || 'var(--accent)';
  document.getElementById('egoName')!.innerHTML = '<span style="color:' + color + '">' + value + '</span> <span style="color:var(--text-muted);font-weight:400;font-size:11px">' + type + '</span>';
  document.getElementById('egoStats')!.textContent = data.entities.length + ' entities';
  (document.getElementById('egoDepth') as HTMLInputElement).style.display = 'none';
  document.getElementById('egoDepthVal')!.style.display = 'none';
  (document.querySelector('.ego-bar label') as HTMLElement).style.display = 'none';
  egoMode = true;

  const svg = document.getElementById('graphSvg')!;
  const rect = svg.getBoundingClientRect();
  const w = rect.width || 800, h = rect.height || 600;
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  viewTransform = { x: 0, y: 0, scale: 1 };
  applyTransform();

  const maxScore = Math.max(...data.entities.map(e => e.totalScore));
  const entities = data.entities.slice(0, 40);
  const simNodes: Array<SimNode & { score: number; occurrences: number; r: number }> = entities.map((e, i) => {
    const angle = (i / entities.length) * 2 * Math.PI;
    const radius = Math.min(w, h) * 0.35;
    return {
      id: e.name, x: w/2 + Math.cos(angle) * radius, y: h/2 + Math.sin(angle) * radius,
      name: e.name, type: e.subgraphType || 'unknown',
      score: e.totalScore, occurrences: e.occurrences,
      r: 10 + (e.totalScore / maxScore) * 16,
      confidence: 0.8, fixed: false,
    };
  });

  const minSep = 70;
  for (let iter = 0; iter < 200; iter++) {
    const cooling = Math.max(0.01, 1 - iter / 200);
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i], b = simNodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
        const force = dist < minSep ? (minSep - dist) * 1.5 : (minSep * minSep) / (dist * dist) * 5;
        const fx = (dx / dist) * force * cooling, fy = (dy / dist) * force * cooling;
        a.x -= fx; a.y -= fy; b.x += fx; b.y += fy;
      }
    }
    for (const n of simNodes) {
      n.x += (w/2 - n.x) * 0.005 * cooling;
      n.y += (h/2 - n.y) * 0.005 * cooling;
      n.x = Math.max(60, Math.min(w - 60, n.x));
      n.y = Math.max(60, Math.min(h - 60, n.y));
    }
  }

  deOverlapLabels(simNodes);
  currentNodes = entities.map(e => ({ id: e.name, name: e.name, subgraphType: e.subgraphType || 'unknown' } as NodeDto));

  let s = '';
  for (const n of simNodes) {
    const nc = TYPE_COLORS[n.type?.toLowerCase()] || color;
    const opacity = 0.5 + (n.score / maxScore) * 0.5;
    const ly = n.labelY || (n.y + n.r + 14);
    s += '<g class="node" data-id="' + n.id + '" onclick="navigateToNodeByName(\'' + n.name.replace(/'/g, "\\'") + '\')">';
    s += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="' + nc + '" fill-opacity="' + opacity + '" stroke="' + nc + '"/>';
    s += '<text x="' + n.x + '" y="' + ly + '" text-anchor="middle" style="font-size:11px">' + n.name + '</text>';
    s += '</g>';
  }
  document.getElementById('graphGroup')!.innerHTML = s;

  const panel = document.getElementById('detailPanel')!;
  panel.className = 'detail-panel';
  let ph = '<div class="detail-header"><h3 style="color:' + color + '">' + value + '</h3><span class="type-badge" style="background:' + color + '22;color:' + color + '">' + type + '</span></div>';
  ph += '<div class="detail-section"><h4>Entities ranked by ' + type + ' intensity</h4>';
  for (const e of entities.slice(0, 20)) {
    ph += '<div class="prop-row"><span class="prop-key">' + entityLink(e.name) + '</span>';
    ph += '<span class="attr-tag">score: ' + e.totalScore.toFixed(2) + '</span> ';
    ph += '<span class="attr-tag">×' + e.occurrences + '</span></div>';
  }
  ph += '</div>';
  panel.innerHTML = ph;
}

// -- Ego-centric view --
let egoMode = false;
let egoFocusId: string | null = null;
let egoDepth = 1;
let lastSubgraphId: string | null = null;

async function openEgo(nodeId: string): Promise<void> {
  egoFocusId = nodeId;
  egoDepth = 1;
  egoMode = true;
  (document.getElementById('egoDepth') as HTMLInputElement).value = '1';
  document.getElementById('egoDepthVal')!.textContent = '1';
  document.getElementById('egoBar')!.style.display = '';
  document.getElementById('sidebar')!.style.display = 'none';
  const activeSg = document.querySelector('.sg-item.active') as HTMLElement | null;
  if (activeSg) lastSubgraphId = activeSg.dataset.id || null;
  await renderEgo();
}

async function updateEgoDepth(val: string): Promise<void> {
  egoDepth = parseInt(val);
  document.getElementById('egoDepthVal')!.textContent = val;
  await renderEgo();
}

function exitEgo(): void {
  egoMode = false;
  egoFocusId = null;
  document.getElementById('egoBar')!.style.display = 'none';
  document.getElementById('sidebar')!.style.display = '';
  (document.getElementById('egoDepth') as HTMLInputElement).style.display = '';
  document.getElementById('egoDepthVal')!.style.display = '';
  (document.querySelector('.ego-bar label') as HTMLElement).style.display = '';
  if (lastSubgraphId) loadSubgraph(lastSubgraphId);
}

async function renderEgo(): Promise<void> {
  const data = await fetchJson<EgoData>('/ego/' + egoFocusId + '?depth=' + egoDepth + '&maxNodes=60');
  if (!data || data.error) return;

  const focusName = globalNodeNames.get(egoFocusId!) || egoFocusId!;
  document.getElementById('egoName')!.textContent = focusName;
  document.getElementById('egoStats')!.textContent = data.nodes.length + ' nodes, ' + data.edges.length + ' edges' + (data.capped ? ' (capped at ' + data.maxNodes + ')' : '');

  currentNodes = data.nodes;
  currentEdges = data.edges;

  const svg = document.getElementById('graphSvg')!;
  const rect = svg.getBoundingClientRect();
  const w = rect.width || 800, h = rect.height || 600;
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  viewTransform = { x: 0, y: 0, scale: 1 };
  applyTransform();

  const cx = w / 2, cy = h / 2;
  const simNodes: SimNode[] = currentNodes.map((n, i) => {
    if (n.id === egoFocusId) return { id: n.id, x: cx, y: cy, name: n.name, type: n.subgraphType, confidence: n.confidenceValue ?? 0.8, fixed: true };
    const angle = (i / (currentNodes.length - 1)) * 2 * Math.PI;
    const radius = Math.min(w, h) * 0.35;
    return { id: n.id, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, name: n.name, type: n.subgraphType, confidence: n.confidenceValue ?? 0.8, fixed: false };
  });
  const simNodeById = new Map<string, SimNode>(simNodes.map(n => [n.id, n]));
  const simEdges: SimEdge[] = currentEdges
    .filter(e => simNodeById.has(e.sourceNodeId) && simNodeById.has(e.targetNodeId))
    .map(e => ({ source: simNodeById.get(e.sourceNodeId)!, target: simNodeById.get(e.targetNodeId)!, type: e.edgeType, id: e.id }));

  const minSep = 80;
  for (let iter = 0; iter < 300; iter++) {
    const cooling = Math.max(0.01, 1 - iter / 300);
    for (let i = 0; i < simNodes.length; i++) {
      if (simNodes[i].fixed) continue;
      for (let j = i + 1; j < simNodes.length; j++) {
        if (simNodes[j].fixed) continue;
        const a = simNodes[i], b = simNodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
        const force = dist < minSep ? (minSep - dist) * 1.5 : (minSep * minSep) / (dist * dist) * 10;
        const fx = (dx / dist) * force * cooling, fy = (dy / dist) * force * cooling;
        a.x -= fx; a.y -= fy; b.x += fx; b.y += fy;
      }
    }
    for (const e of simEdges) {
      if (e.source.fixed && e.target.fixed) continue;
      const dx = e.target.x - e.source.x, dy = e.target.y - e.source.y;
      const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
      const idealLen = 150;
      if (dist > idealLen) {
        const force = (dist - idealLen) * 0.003 * cooling;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (!e.source.fixed) { e.source.x += fx; e.source.y += fy; }
        if (!e.target.fixed) { e.target.x -= fx; e.target.y -= fy; }
      }
    }
    for (const n of simNodes) {
      if (n.fixed) continue;
      n.x = Math.max(60, Math.min(w - 60, n.x));
      n.y = Math.max(60, Math.min(h - 60, n.y));
    }
  }

  deOverlapLabels(simNodes);

  let s = '';
  for (const e of simEdges) {
    const r1 = e.source.id === egoFocusId ? 24 : 16;
    const r2 = e.target.id === egoFocusId ? 24 : 16;
    const ln = shortenLine(e.source.x, e.source.y, e.target.x, e.target.y, Math.max(r1, r2) + 2);
    const mx = (e.source.x + e.target.x) / 2, my = (e.source.y + e.target.y) / 2;
    s += '<line class="edge" x1="' + ln.x1 + '" y1="' + ln.y1 + '" x2="' + ln.x2 + '" y2="' + ln.y2 + '"/>';
    s += '<text class="edge-label" x="' + mx + '" y="' + (my - 4) + '" text-anchor="middle">' + e.type + '</text>';
  }
  for (const n of simNodes) {
    const color = TYPE_COLORS[n.type?.toLowerCase()] || TYPE_COLORS.general;
    const opacity = 0.4 + (n.confidence * 0.6);
    const r = n.id === egoFocusId ? 24 : 16;
    const ly = n.labelY || (n.y + r + 14);
    s += '<g class="node' + (n.id === egoFocusId ? ' selected' : '') + '" data-id="' + n.id + '" onclick="selectNode(\'' + n.id + '\')" ondblclick="openEgo(\'' + n.id + '\')">';
    s += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + r + '" fill="' + color + '" fill-opacity="' + opacity + '" stroke="' + color + '"/>';
    s += '<text x="' + n.x + '" y="' + ly + '" text-anchor="middle" style="font-size:12px">' + n.name + '</text>';
    s += '</g>';
  }
  document.getElementById('graphGroup')!.innerHTML = s;
  selectNode(egoFocusId!);
}
