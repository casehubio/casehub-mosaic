"use strict";
const BRAIN_REGION_COLORS = {
    social: '#f472b6', executive: '#34d399', episodic: '#60a5fa',
    semantic: '#fb923c', habitual: '#fb7185', judgment: '#a78bfa',
    categorical: '#6b7280', normative: '#c084fc', limbic: '#fbbf24',
};
let _brainGraph = null;
let _brainMeshObj = null;
let _cachedBrainData = null;
let _brainHighlightedNodeId = null;
let _brainHighlightedNeighborIds = new Set();
let _brainScale = 1.0;
let _brainEdgeCounts = new Map();
const CAPS_TYPE_COLORS = {
    INPUT: '#6366f1', MEDIATING: '#94a3b8', OUTPUT: '#f59e0b',
};
let _brainViewState = 'BRAIN_IDLE';
let _brainSavedCameraPos = null;
let _brainLastClickTime = 0;
let _brainLastClickNodeId = null;
function brainNodeColor(node) {
    if (node.id.startsWith('_outline-'))
        return 'rgba(0, 0, 0, 0)';
    if (_brainHighlightedNodeId) {
        if (node.id === _brainHighlightedNodeId)
            return '#facc15';
        if (_brainHighlightedNeighborIds.has(node.id)) {
            if (!isBrainRegionActive(node.regionId))
                return 'rgba(100, 116, 139, 0.15)';
            return BRAIN_REGION_COLORS[node.regionId] || '#6b7280';
        }
        return 'rgba(100, 116, 139, 0.2)';
    }
    if (!isBrainRegionActive(node.regionId))
        return 'rgba(100, 116, 139, 0.15)';
    if (node.nodeType === 'caps')
        return CAPS_TYPE_COLORS[node.capsType || ''] || '#94a3b8';
    if (node.nodeType === 'mood')
        return '#fbbf24';
    if (node.nodeType === 'affect')
        return '#f97316';
    return BRAIN_REGION_COLORS[node.regionId] || '#6b7280';
}
function brainLinkColor(link) {
    if (link.type === 'outline')
        return 'rgba(99, 102, 241, 0.2)';
    const src = typeof link.source === 'object' ? link.source.id : link.source;
    const tgt = typeof link.target === 'object' ? link.target.id : link.target;
    if (_brainHighlightedNodeId) {
        if (src === _brainHighlightedNodeId || tgt === _brainHighlightedNodeId)
            return 'rgba(250, 204, 21, 0.8)';
        return 'rgba(100, 116, 139, 0.08)';
    }
    if (link.linkType === 'caps')
        return 'rgba(148, 163, 184, 0.25)';
    if (link.linkType === 'affect')
        return 'rgba(251, 191, 36, 0.4)';
    return 'rgba(100, 116, 139, 0.35)';
}
function brainNodeSize(node) {
    if (node.id.startsWith('_outline-'))
        return 0.01;
    if (node.nodeType === 'caps') {
        if (node.capsType === 'INPUT')
            return 1.2;
        if (node.capsType === 'OUTPUT')
            return 1.4;
        return 0.8;
    }
    if (node.nodeType === 'mood')
        return 2;
    if (node.nodeType === 'affect')
        return 1.8;
    var edgeCount = _brainEdgeCounts.get(node.id) || 0;
    var baseSize = 1.5 + (node.confidenceValue ?? 0.8) * 1.5;
    var connectivityBoost = Math.min(edgeCount * 0.3, 2.0);
    return baseSize + connectivityBoost;
}
function buildBrainNodeThreeObject(node) {
    if (node.id.startsWith('_outline-'))
        return undefined;
    if (node.nodeType !== 'entity')
        return undefined;
    var edgeCount = _brainEdgeCounts.get(node.id) || 0;
    if (edgeCount < 1 && (node.confidenceValue ?? 0) < 0.5)
        return undefined;
    var THREE = window.THREE;
    if (!THREE)
        return undefined;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx)
        return undefined;
    var name = node.name || '';
    if (name.length > 20)
        name = name.substring(0, 18) + '..';
    var fontSize = 24;
    ctx.font = 'bold ' + fontSize + 'px system-ui, -apple-system, sans-serif';
    var textWidth = ctx.measureText(name).width;
    canvas.width = Math.max(textWidth + 16, 64);
    canvas.height = 36;
    ctx.font = 'bold ' + fontSize + 'px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    var spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        sizeAttenuation: true,
    });
    var sprite = new THREE.Sprite(spriteMat);
    var spriteScale = canvas.width / 22;
    sprite.scale.set(spriteScale, spriteScale * (canvas.height / canvas.width), 1);
    sprite.position.set(0, 5, 0);
    var group = new THREE.Group();
    var color = new THREE.Color(brainNodeColor(node));
    var size = brainNodeSize(node);
    var geometry = new THREE.SphereGeometry(size, 16, 12);
    var material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
        emissive: color,
        emissiveIntensity: 0.25,
    });
    var sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);
    group.add(sprite);
    return group;
}
function initBrain() {
    var container = document.getElementById('brainArea');
    if (!container || _brainGraph)
        return;
    _brainGraph = ForceGraph3D({ controlType: 'orbit' })(container)
        .width(container.clientWidth)
        .height(container.clientHeight)
        .backgroundColor('#0f1117')
        .nodeColor(function (node) { return brainNodeColor(node); })
        .nodeVal(function (node) { var s = brainNodeSize(node); return s * s; })
        .nodeLabel(function (node) {
        if (node.id.startsWith('_outline-'))
            return '';
        var label = node.name || node.id;
        if (node.nodeType === 'caps')
            label = '[' + (node.capsType || 'CAPS') + '] ' + label;
        return label;
    })
        .nodeOpacity(0.9)
        .nodeThreeObject(function (node) { return buildBrainNodeThreeObject(node); })
        .linkColor(function (link) { return brainLinkColor(link); })
        .linkWidth(function (link) {
        if (link.type === 'outline')
            return 0.3;
        if (link.linkType === 'caps')
            return 0.3;
        if (link.linkType === 'affect')
            return 1.5;
        return 0.8;
    })
        .linkOpacity(0.5)
        .linkDirectionalArrowLength(2.5)
        .linkDirectionalArrowRelPos(1)
        .onNodeClick(function (node) {
        if (node.id && node.id.startsWith('_outline-'))
            return;
        var now = Date.now();
        if (_brainLastClickNodeId === node.id && now - _brainLastClickTime < 300) {
            _brainLastClickTime = 0;
            _brainLastClickNodeId = null;
            if (node.nodeType === 'entity')
                focusBrainNode(node.id);
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
            if (s === node.id)
                _brainHighlightedNeighborIds.add(t);
            if (t === node.id)
                _brainHighlightedNeighborIds.add(s);
        }
        _brainGraph.nodeColor(function (n) { return brainNodeColor(n); })
            .linkColor(function (l) { return brainLinkColor(l); });
        selectNode(node.id);
    })
        .onBackgroundClick(function () {
        _brainHighlightedNodeId = null;
        _brainHighlightedNeighborIds = new Set();
        _brainGraph.nodeColor(function (n) { return brainNodeColor(n); })
            .linkColor(function (l) { return brainLinkColor(l); });
    })
        .enableNodeDrag(false)
        .warmupTicks(200)
        .cooldownTicks(600);
    _brainGraph.d3Force('charge').strength(-120).distanceMax(500);
    _brainGraph.d3Force('link').distance(30).strength(0.3);
    var scene = _brainGraph.scene();
    var THREE = window.THREE;
    if (THREE && scene) {
        var ambient = new THREE.AmbientLight(0x606080, 1.2);
        scene.add(ambient);
        var directional = new THREE.DirectionalLight(0xffffff, 0.5);
        directional.position.set(100, 200, 300);
        scene.add(directional);
    }
    new ResizeObserver(function () {
        if (_brainGraph && container)
            _brainGraph.width(container.clientWidth).height(container.clientHeight);
    }).observe(container);
}
async function loadBrainView() {
    if (!_brainGraph)
        return;
    var response = await fetchBrainData();
    if (!response)
        return;
    _cachedBrainData = response;
    var result = toBrainGraph(response);
    var nodes = result.nodes;
    var links = result.links;
    currentNodes = response.regions.flatMap(function (r) { return r.nodes; });
    currentEdges = response.edges;
    _brainEdgeCounts = new Map();
    for (var li = 0; li < links.length; li++) {
        var lk = links[li];
        if (lk.type === 'outline')
            continue;
        var ls = typeof lk.source === 'string' ? lk.source : lk.source.id;
        var lt = typeof lk.target === 'string' ? lk.target : lk.target.id;
        _brainEdgeCounts.set(ls, (_brainEdgeCounts.get(ls) || 0) + 1);
        _brainEdgeCounts.set(lt, (_brainEdgeCounts.get(lt) || 0) + 1);
    }
    var regionCounts = new Map();
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
                if (pl.normal.x > 0.9)
                    xMax = pl.offset;
                if (pl.normal.x < -0.9)
                    xMin = -pl.offset;
                if (pl.normal.y > 0.9)
                    yMax = pl.offset;
                if (pl.normal.y < -0.9)
                    yMin = -pl.offset;
                if (pl.normal.z > 0.9)
                    zMax = pl.offset;
                if (pl.normal.z < -0.9)
                    zMin = -pl.offset;
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
    addBrainMeshToScene(scaledMesh);
    _brainGraph.d3Force('region', makeRegionContainmentForce(scaledMesh.regionBounds, _brainScale));
    _brainGraph.graphData({ nodes: nodes, links: links });
    _brainGraph.cameraPosition({ x: 120 * _brainScale, y: 80 * _brainScale, z: 180 * _brainScale }, { x: 0, y: 0, z: 0 }, 0);
    renderBrainPillFilters();
    var entityCount = 0;
    var capsCount = 0;
    for (var si = 0; si < nodes.length; si++) {
        if (nodes[si].nodeType === 'entity')
            entityCount++;
        else if (nodes[si].nodeType === 'caps')
            capsCount++;
    }
    var statsEl = document.getElementById('brainStats');
    if (statsEl)
        statsEl.textContent = entityCount + ' entities, ' + capsCount + ' CAPS, ' + links.length + ' edges';
}
function addBrainMeshToScene(meshData) {
    var THREE = window.THREE;
    if (!THREE || !_brainGraph)
        return;
    var scene = _brainGraph.scene();
    if (!scene)
        return;
    if (_brainMeshObj) {
        scene.remove(_brainMeshObj);
        _brainMeshObj = null;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3));
    geometry.setIndex(new THREE.Uint16BufferAttribute(meshData.indices, 1));
    geometry.computeVertexNormals();
    var material = new THREE.MeshPhongMaterial({
        color: 0x4a4e69,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        wireframe: false,
        depthWrite: false,
    });
    _brainMeshObj = new THREE.Mesh(geometry, material);
    scene.add(_brainMeshObj);
    var wireGeo = new THREE.WireframeGeometry(geometry);
    var wireMat = new THREE.LineBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
    });
    var wireframe = new THREE.LineSegments(wireGeo, wireMat);
    _brainMeshObj.add(wireframe);
}
function addBrainOutlineNodes(meshData, nodes, links) {
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
    var edgeSet = new Set();
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
function makeRegionContainmentForce(regionBounds, scale) {
    var forceNodes = [];
    var rx = 52 * scale, ry = 48 * scale, rz = 62 * scale;
    var cy = 2 * scale, cz = 2 * scale;
    function force(alpha) {
        for (var i = 0; i < forceNodes.length; i++) {
            var node = forceNodes[i];
            if (node.id && node.id.startsWith('_outline-'))
                continue;
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
            if (!bounds)
                continue;
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
    force.initialize = function (n) { forceNodes = n; };
    return force;
}
function renderBrainPillFilters() {
    var sidebar = document.getElementById('brainSidebar');
    if (!sidebar)
        return;
    var regions = allBrainRegions();
    regions.sort(function (a, b) { return b.nodeCount - a.nodeCount; });
    var html = '<h2>Regions</h2>';
    for (var i = 0; i < regions.length; i++) {
        var region = regions[i];
        var color = BRAIN_REGION_COLORS[region.regionId] || '#6b7280';
        var activeClass = region.active ? ' active' : '';
        var emptyStyle = region.nodeCount === 0 ? ';opacity:0.4' : '';
        html += '<div class="brain-pill' + activeClass + '" style="' + emptyStyle + '" onclick="toggleBrainFilter(\'' + region.regionId + '\')">'
            + '<span class="pill-dot" style="background:' + color + '"></span>'
            + '<div class="pill-text">'
            + '<span class="pill-label">' + region.functionalLabel + '</span>'
            + '<span class="pill-sub">' + region.anatomicalLabel + '</span>'
            + '</div>'
            + '<span class="badge">' + (region.nodeCount > 0 ? region.nodeCount : '—') + '</span>'
            + '</div>';
    }
    var capsData = _cachedBrainData;
    if (capsData && capsData.capsNodes.length > 0) {
        var inputCount = 0, mediatingCount = 0, outputCount = 0;
        for (var ci = 0; ci < capsData.capsNodes.length; ci++) {
            var cn = capsData.capsNodes[ci];
            if (cn.type === 'INPUT')
                inputCount++;
            else if (cn.type === 'MEDIATING')
                mediatingCount++;
            else if (cn.type === 'OUTPUT')
                outputCount++;
        }
        html += '<h2 style="margin-top:16px">CAPS Network</h2>';
        html += '<div class="brain-pill" style="cursor:default">'
            + '<span class="pill-dot" style="background:#6366f1"></span>'
            + '<div class="pill-text"><span class="pill-label">Input</span><span class="pill-sub">Sensory</span></div>'
            + '<span class="badge">' + inputCount + '</span></div>';
        html += '<div class="brain-pill" style="cursor:default">'
            + '<span class="pill-dot" style="background:#94a3b8"></span>'
            + '<div class="pill-text"><span class="pill-label">Mediating</span><span class="pill-sub">Processing</span></div>'
            + '<span class="badge">' + mediatingCount + '</span></div>';
        html += '<div class="brain-pill" style="cursor:default">'
            + '<span class="pill-dot" style="background:#f59e0b"></span>'
            + '<div class="pill-text"><span class="pill-label">Output</span><span class="pill-sub">Behavioral</span></div>'
            + '<span class="badge">' + outputCount + '</span></div>';
    }
    if (capsData && capsData.moodSnapshots.length > 0) {
        var latest = capsData.moodSnapshots[0];
        html += '<h2 style="margin-top:16px">Mood</h2>';
        html += '<div class="brain-pill" style="cursor:default">'
            + '<span class="pill-dot" style="background:#fbbf24"></span>'
            + '<div class="pill-text"><span class="pill-label">Snapshots</span>'
            + '<span class="pill-sub">' + capsData.moodSnapshots.length + ' samples</span></div></div>';
        if (latest.pleasure != null) {
            html += '<div style="padding:4px 16px 8px"><div class="pad-pill" style="font-size:11px;gap:6px">'
                + '<span class="pad-p" style="padding:2px 6px">P ' + latest.pleasure.toFixed(2) + '</span>'
                + '<span class="pad-a" style="padding:2px 6px">A ' + (latest.arousal || 0).toFixed(2) + '</span>'
                + '<span class="pad-d" style="padding:2px 6px">D ' + (latest.dominance || 0).toFixed(2) + '</span>'
                + '</div></div>';
        }
    }
    sidebar.innerHTML = html;
}
function toggleBrainFilter(regionId) {
    toggleBrainRegion(regionId);
    renderBrainPillFilters();
    if (_brainGraph) {
        _brainGraph
            .nodeColor(function (n) { return brainNodeColor(n); })
            .linkColor(function (l) { return brainLinkColor(l); })
            .nodeThreeObject(function (n) { return buildBrainNodeThreeObject(n); });
    }
}
function focusBrainNode(nodeId) {
    if (_brainViewState !== 'BRAIN_IDLE' || !_brainGraph)
        return;
    _brainViewState = 'ZOOMING_IN';
    var gd = _brainGraph.graphData();
    var node = gd.nodes.find(function (n) { return n.id === nodeId; });
    if (!node) {
        _brainViewState = 'BRAIN_IDLE';
        return;
    }
    var cam = _brainGraph.camera();
    _brainSavedCameraPos = {
        pos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        lookAt: { x: 0, y: 0, z: 0 },
    };
    var zoomTarget = { x: node.x || 0, y: node.y || 0, z: (node.z || 0) + 100 };
    _brainGraph.cameraPosition(zoomTarget, { x: node.x || 0, y: node.y || 0, z: node.z || 0 }, 600);
    fadeBrainMesh(0.06, 0, 600);
    fetch('/api/workbench/ego/' + nodeId + '?depth=2&maxNodes=200')
        .then(function (r) { return r.json(); })
        .then(function (egoData) {
        if (egoData.error)
            throw new Error(egoData.error);
        setTimeout(function () {
            renderBrainEgo(egoData, nodeId);
            _brainViewState = 'EGO_ACTIVE';
            showBackToBrainButton(true);
        }, 650);
    })
        .catch(function () {
        if (_brainSavedCameraPos) {
            _brainGraph.cameraPosition(_brainSavedCameraPos.pos, _brainSavedCameraPos.lookAt, 400);
        }
        fadeBrainMesh(0, 0.06, 400);
        _brainViewState = 'BRAIN_IDLE';
    });
}
function renderBrainEgo(egoData, focusId) {
    var nodes = egoData.nodes.map(function (n) {
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
    var links = egoData.edges.map(function (e) {
        return { source: e.sourceNodeId, target: e.targetNodeId, type: e.edgeType, linkType: 'entity' };
    });
    _brainEdgeCounts = new Map();
    for (var eli = 0; eli < links.length; eli++) {
        var elk = links[eli];
        _brainEdgeCounts.set(elk.source, (_brainEdgeCounts.get(elk.source) || 0) + 1);
        _brainEdgeCounts.set(elk.target, (_brainEdgeCounts.get(elk.target) || 0) + 1);
    }
    _brainGraph.d3Force('region', null);
    _brainGraph.d3Force('charge').strength(-60);
    _brainGraph.nodeColor(function (n) {
        if (n._isEgo)
            return '#facc15';
        return COLORS_3D[n.subgraphType?.toLowerCase()] || '#6b7280';
    });
    _brainGraph.linkColor(function () { return 'rgba(100, 116, 139, 0.4)'; });
    _brainGraph.nodeThreeObject(function (n) { return buildBrainNodeThreeObject(n); });
    _brainGraph.graphData({ nodes: nodes, links: links });
    _brainGraph.cameraPosition({ x: 0, y: 0, z: 300 }, { x: 0, y: 0, z: 0 }, 400);
    currentNodes = egoData.nodes;
    currentEdges = egoData.edges;
}
function returnToBrain() {
    if (_brainViewState !== 'EGO_ACTIVE' || !_brainGraph)
        return;
    _brainViewState = 'ZOOMING_OUT';
    if (_brainSavedCameraPos) {
        _brainGraph.cameraPosition(_brainSavedCameraPos.pos, _brainSavedCameraPos.lookAt, 600);
    }
    fadeBrainMesh(0, 0.06, 600);
    setTimeout(function () {
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
            _brainEdgeCounts = new Map();
            for (var ri = 0; ri < result.links.length; ri++) {
                var rl = result.links[ri];
                if (rl.type === 'outline')
                    continue;
                _brainEdgeCounts.set(rl.source, (_brainEdgeCounts.get(rl.source) || 0) + 1);
                _brainEdgeCounts.set(rl.target, (_brainEdgeCounts.get(rl.target) || 0) + 1);
            }
            _brainGraph.d3Force('region', makeRegionContainmentForce(scaledMesh.regionBounds, _brainScale));
            _brainGraph.d3Force('charge').strength(-120);
            _brainGraph
                .nodeColor(function (n) { return brainNodeColor(n); })
                .linkColor(function (l) { return brainLinkColor(l); })
                .nodeThreeObject(function (n) { return buildBrainNodeThreeObject(n); });
            _brainGraph.graphData({ nodes: result.nodes, links: result.links });
            currentNodes = _cachedBrainData.regions.flatMap(function (r) { return r.nodes; });
            currentEdges = _cachedBrainData.edges;
        }
        _brainViewState = 'BRAIN_IDLE';
        _brainHighlightedNodeId = null;
        _brainHighlightedNeighborIds = new Set();
        showBackToBrainButton(false);
    }, 650);
}
function fadeBrainMesh(fromOpacity, toOpacity, duration) {
    if (!_brainMeshObj || !_brainMeshObj.material)
        return;
    var start = performance.now();
    function step(time) {
        var progress = Math.min((time - start) / duration, 1);
        _brainMeshObj.material.opacity = fromOpacity + (toOpacity - fromOpacity) * progress;
        if (progress < 1)
            requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}
function showBackToBrainButton(show) {
    var btn = document.getElementById('backToBrainBtn');
    if (btn)
        btn.style.display = show ? '' : 'none';
}
