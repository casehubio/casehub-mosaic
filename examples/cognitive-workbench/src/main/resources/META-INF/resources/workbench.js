"use strict";
const API = '/api/workbench';
const TYPE_COLORS = {
    person: '#f472b6', goal: '#34d399', activity: '#60a5fa',
    place: '#fbbf24', project: '#a78bfa', concept: '#fb923c',
    organisation: '#94a3b8', general: '#6b7280',
};
let allSubgraphs = [];
let currentNodes = [];
let currentEdges = [];
let mutationCounter = 0;
const globalNodeNames = new Map();
let referenceOverlay = {};
let showReference = true;
async function fetchJson(path) {
    const r = await fetch(API + path);
    return r.ok ? r.json() : null;
}
async function init() {
    const status = await fetchJson('/status');
    if (status) {
        document.getElementById('stats').textContent = 'Tenant: ' + status.tenantId + ' | Agent: ' + status.agentId;
        if (status.subjectName)
            window.subjectName = status.subjectName;
    }
    allSubgraphs = await fetchJson('/subgraphs') || [];
    renderSidebar();
    for (const sg of allSubgraphs) {
        const nodes = await fetchJson('/subgraphs/' + sg.id + '/nodes') || [];
        for (const n of nodes)
            globalNodeNames.set(n.id, n.name);
        const el = document.getElementById('count-' + sg.id);
        if (el)
            el.textContent = String(nodes.length);
    }
    const overlayData = await fetchJson('/reference-overlay');
    if (overlayData && overlayData.entries)
        referenceOverlay = overlayData.entries;
    if (allSubgraphs.length > 0)
        await loadSubgraph(allSubgraphs[0].id);
    if (window.subjectName) {
        for (const [id, name] of globalNodeNames) {
            if (name === window.subjectName) {
                window.subjectNodeId = id;
                break;
            }
        }
    }
    setupPanZoom();
    connectWebSocket();
}
function renderSidebar() {
    const sb = document.getElementById('sidebar');
    sb.innerHTML = '<h2>Subgraphs</h2>';
    for (const sg of allSubgraphs) {
        const div = document.createElement('div');
        div.className = 'sg-item';
        div.dataset.id = sg.id;
        const color = TYPE_COLORS[sg.type?.toLowerCase()] || TYPE_COLORS.general;
        div.innerHTML = '<span class="sg-dot" style="background:' + color + '"></span>' + (sg.name || sg.type)
            + '<span class="badge" id="count-' + sg.id + '">...</span>';
        div.onclick = () => loadSubgraph(sg.id);
        sb.appendChild(div);
    }
}
async function loadSubgraph(sgId) {
    document.querySelectorAll('.sg-item').forEach(el => el.classList.toggle('active', el.dataset.id === sgId));
    const nodes = await fetchJson('/subgraphs/' + sgId + '/nodes') || [];
    const el = document.getElementById('count-' + sgId);
    if (el)
        el.textContent = String(nodes.length);
    const edgeSets = await Promise.all(nodes.map(n => fetchJson('/nodes/' + n.id + '/neighbors')));
    const edgeMap = new Map();
    for (const edges of edgeSets) {
        if (!edges)
            continue;
        for (const e of edges)
            edgeMap.set(e.id, e);
    }
    currentNodes = nodes;
    currentEdges = [...edgeMap.values()];
    renderGraph();
}
async function selectNode(nodeId) {
    document.querySelectorAll('.node').forEach(el => {
        el.classList.remove('selected', 'fresh');
        if (el.dataset.id === nodeId) {
            el.classList.add('selected', 'fresh');
            setTimeout(() => el.classList.remove('fresh'), 4000);
        }
    });
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node)
        return;
    const edges = await fetchJson('/nodes/' + nodeId + '/neighbors') || [];
    const nodeById = new Map(currentNodes.map(n => [n.id, n]));
    const panel = document.getElementById('detailPanel');
    panel.className = 'detail-panel';
    const typeColor = TYPE_COLORS[node.subgraphType?.toLowerCase()] || TYPE_COLORS.general;
    let h = '<div class="detail-header selected" style="border-left-color:' + typeColor + ';background:linear-gradient(90deg,' + typeColor + '11,transparent 40%)">'
        + '<h3><span class="selected-indicator" style="background:' + typeColor + '"></span>' + entityLink(node.name) + '</h3>'
        + '<span class="type-badge" style="background:' + typeColor + '22;color:' + typeColor + '">' + node.subgraphType + '</span>';
    if (node.validFrom || node.validUntil) {
        const from = node.validFrom ? node.validFrom.substring(0, 4) : '?';
        const until = node.validUntil ? node.validUntil.substring(0, 4) : '';
        h += ' <span style="font-size:11px;color:var(--text-muted)">' + from + (until && until !== from ? '–' + until : '') + '</span>';
    }
    h += '</div>';
    const ref = referenceOverlay[node.name];
    if (ref) {
        h += '<div class="ref-overlay" id="section-reference" style="' + (visibleSections.reference ? '' : 'display:none') + '">';
        h += '<div class="ref-badge">Reference — not stored in cognitive model</div>';
        if (ref.description)
            h += '<div class="ref-desc">' + ref.description + '</div>';
        if (ref.context)
            h += '<div class="ref-ctx">' + ref.context + '</div>';
        h += '</div>';
    }
    if (node.pleasure != null) {
        h += '<div class="detail-section" id="section-pad" style="' + (visibleSections.pad ? '' : 'display:none') + '"><h4>Affect (PAD)</h4><div class="pad-pill">'
            + '<span class="pad-p">P ' + node.pleasure?.toFixed(2) + '</span>'
            + '<span class="pad-a">A ' + node.arousal?.toFixed(2) + '</span>'
            + '<span class="pad-d">D ' + node.dominance?.toFixed(2) + '</span>'
            + '</div></div>';
    }
    if (node.confidenceValue != null) {
        h += '<div class="detail-section"><h4>Confidence</h4><div style="font-size:12px">'
            + node.confidenceValue.toFixed(2) + ' [' + node.confidenceOrigin + ']</div></div>';
    }
    if (edges.length > 0) {
        h += '<div class="detail-section"><h4>Connections (' + edges.length + ')</h4>';
        for (const e of edges) {
            const otherId = e.sourceNodeId === nodeId ? e.targetNodeId : e.sourceNodeId;
            const otherName = nodeById.get(otherId)?.name || globalNodeNames.get(otherId) || otherId;
            const dir = e.sourceNodeId === nodeId ? '→' : '←';
            const safeName = escapeAttr(otherName);
            if (currentView === 'graph3d' && typeof panelLinkClick === 'function') {
                h += '<div class="edge-item" style="cursor:pointer" onclick="panelLinkClick(\'' + otherId + '\', event)"><span class="edge-type">' + e.edgeType + '</span> ' + dir + ' <a href="#" class="entity-link" onclick="return false">' + safeName + '</a></div>';
            }
            else {
                h += '<div class="edge-item"><span class="edge-type">' + e.edgeType + '</span> ' + dir + ' <a href="#" onclick="navigateToNode(\'' + otherId + '\');return false" class="entity-link">' + safeName + '</a></div>';
            }
        }
        h += '</div>';
    }
    const props = node.properties;
    if (props && Object.keys(props).length > 0) {
        h += '<div class="detail-section"><h4>Properties</h4>';
        for (const [k, v] of Object.entries(props)) {
            h += '<div class="prop-row"><span class="prop-key">' + k + '</span>' + autoLink(v) + '</div>';
        }
        h += '</div>';
    }
    const profile = await fetchJson('/cognitive-profile/' + encodeURIComponent(node.name));
    if (profile && profile.memoryCount > 0) {
        h += '<div class="detail-section"><h4>Cognitive Fingerprint (' + profile.memoryCount + ' memories)</h4>';
        if (profile.pad) {
            h += '<div style="margin-bottom:6px"><div class="pad-pill"><span class="pad-p">P ' + profile.pad.pleasure.toFixed(2) + '</span><span class="pad-a">A ' + profile.pad.arousal.toFixed(2) + '</span><span class="pad-d">D ' + profile.pad.dominance.toFixed(2) + '</span></div></div>';
        }
        if (profile.emotions && profile.emotions.length > 0) {
            h += '<div style="margin-bottom:4px">';
            for (const e of profile.emotions.slice(0, 8)) {
                const cls = e.avgIntensity >= 0.7 ? 'high' : e.avgIntensity >= 0.4 ? 'mid' : 'low';
                const tip = EMOTION_TIPS[e.emotion] || '';
                h += '<span class="emotion-pill ' + cls + '" title="' + tip + '" onclick="event.stopPropagation();exploreDimension(\'emotion\',\'' + e.emotion + '\')">' + e.emotion + ' ' + e.avgIntensity.toFixed(2) + ' <span style="opacity:0.5">×' + e.occurrences + '</span></span> ';
            }
            h += '</div>';
        }
        if (profile.tendencies && profile.tendencies.length > 0) {
            h += '<div style="margin-bottom:4px">';
            for (const t of profile.tendencies.slice(0, 5)) {
                const tip = TENDENCY_TIPS[t.tendency] || '';
                h += '<span class="tendency-pill" title="' + tip + '" onclick="event.stopPropagation();exploreDimension(\'tendency\',\'' + t.tendency + '\')">' + t.tendency + ' <span style="opacity:0.5">×' + t.count + '</span></span> ';
            }
            h += '</div>';
        }
        if (profile.distortions && profile.distortions.length > 0) {
            h += '<div style="margin-bottom:4px">';
            for (const d of profile.distortions.slice(0, 4)) {
                const tip = DISTORTION_TIPS[d.distortion] || '';
                h += '<span class="distortion-pill" title="' + tip + '" onclick="event.stopPropagation();exploreDimension(\'distortion\',\'' + d.distortion + '\')">' + d.distortion + ' <span style="opacity:0.5">×' + d.count + '</span></span> ';
            }
            h += '</div>';
        }
        h += '</div>';
    }
    const memories = await fetchJson('/memories-mentioning/' + encodeURIComponent(node.name)) || [];
    if (memories.length > 0) {
        h += '<div class="detail-section"><h4>Memories (' + memories.length + ')</h4>';
        for (const m of memories) {
            h += renderMemoryCard(m);
        }
        h += '</div>';
    }
    panel.innerHTML = h;
}
async function navigateToNode(nodeId) {
    switchView('graph');
    if (egoMode) {
        openEgo(nodeId);
        return;
    }
    if (currentNodes.find(n => n.id === nodeId)) {
        selectNode(nodeId);
        return;
    }
    for (const sg of allSubgraphs) {
        const nodes = await fetchJson('/subgraphs/' + sg.id + '/nodes') || [];
        if (nodes.find(n => n.id === nodeId)) {
            await loadSubgraph(sg.id);
            selectNode(nodeId);
            return;
        }
    }
}
async function navigateToNodeByName(name) {
    switchView('graph');
    const nameLower = name.toLowerCase();
    if (egoMode) {
        for (const n of currentNodes) {
            if (n.name.toLowerCase() === nameLower) {
                openEgo(n.id);
                return;
            }
        }
        for (const [id, gName] of globalNodeNames) {
            const gLower = gName.toLowerCase();
            if (gLower === nameLower || gLower.startsWith(nameLower + ' ') || gLower.endsWith(' ' + nameLower)) {
                openEgo(id);
                return;
            }
        }
        return;
    }
    for (const n of currentNodes) {
        if (n.name.toLowerCase() === nameLower) {
            selectNode(n.id);
            return;
        }
    }
    for (const [id, gName] of globalNodeNames) {
        const gLower = gName.toLowerCase();
        if (gLower === nameLower) {
            await navigateToNode(id);
            return;
        }
        if (gLower.startsWith(nameLower + ' ') || gLower.endsWith(' ' + nameLower)) {
            await navigateToNode(id);
            return;
        }
        if (nameLower.startsWith(gLower + ' ') || nameLower.endsWith(' ' + gLower)) {
            await navigateToNode(id);
            return;
        }
    }
}
function escapeAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function entityLink(name, displayName) {
    const dn = escapeAttr(displayName || name);
    return '<a href="#" onclick="navigateToNodeByName(&#39;' + escapeAttr(name) + '&#39;);return false" class="entity-link">' + dn + '</a>';
}
function autoLinkText(text) {
    if (!text)
        return '';
    const fullNames = [];
    const shortNames = new Map();
    for (const [_id, name] of globalNodeNames) {
        if (name.length >= 4)
            fullNames.push(name);
        const parts = name.split(' ');
        if (parts.length > 1 && parts[0].length >= 4) {
            const first = parts[0];
            if (!shortNames.has(first))
                shortNames.set(first, []);
            shortNames.get(first).push(name);
        }
    }
    for (const [first, matches] of shortNames) {
        if (matches.length === 1)
            fullNames.push({ short: first, full: matches[0] });
    }
    fullNames.sort((a, b) => {
        const la = typeof a === 'string' ? a.length : a.short.length;
        const lb = typeof b === 'string' ? b.length : b.short.length;
        return lb - la;
    });
    let result = text;
    const used = new Set();
    for (const entry of fullNames) {
        const searchName = typeof entry === 'string' ? entry : entry.short;
        const linkName = typeof entry === 'string' ? entry : entry.full;
        const idx = result.indexOf(searchName);
        if (idx === -1)
            continue;
        const beforeChar = idx > 0 ? result[idx - 1] : '';
        if (beforeChar && /[a-zA-Z]/.test(beforeChar))
            continue;
        const afterChar = result[idx + searchName.length];
        if (afterChar && /[a-zA-Z]/.test(afterChar))
            continue;
        let overlap = false;
        for (const u of used) {
            if (idx < u.end && idx + searchName.length > u.start) {
                overlap = true;
                break;
            }
        }
        if (overlap)
            continue;
        const link = entityLink(linkName, searchName);
        result = result.substring(0, idx) + link + result.substring(idx + searchName.length);
        used.add({ start: idx, end: idx + link.length });
    }
    return result;
}
function autoLink(value) {
    if (!value || typeof value !== 'string')
        return value || '';
    const nameLower = value.toLowerCase().trim();
    for (const [_id, name] of globalNodeNames) {
        if (name.toLowerCase() === nameLower)
            return entityLink(name, value);
    }
    if (nameLower.includes('-')) {
        const readable = value.replace(/-/g, ' ');
        for (const [_id, name] of globalNodeNames) {
            if (name.toLowerCase() === readable.toLowerCase())
                return entityLink(name, value);
        }
    }
    const matches = [];
    for (const [_id, name] of globalNodeNames) {
        if (name.toLowerCase().startsWith(nameLower + ' ') || name.toLowerCase().endsWith(' ' + nameLower)) {
            matches.push(name);
        }
    }
    if (matches.length === 1)
        return entityLink(matches[0], value);
    return value;
}
function connectWebSocket() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(proto + '//' + location.host + '/ws/workbench');
    ws.onopen = () => {
        document.getElementById('wsDot').className = 'ws-dot connected';
        document.getElementById('wsStatus').textContent = 'Connected';
    };
    ws.onclose = () => {
        document.getElementById('wsDot').className = 'ws-dot disconnected';
        document.getElementById('wsStatus').textContent = 'Disconnected';
        setTimeout(connectWebSocket, 3000);
    };
    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.type === 'mutation') {
            mutationCounter++;
            document.getElementById('mutationCount').textContent = 'Mutations: ' + mutationCounter;
        }
    };
}
// -- View switching --
let currentView = 'graph';
let memoryData = null;
let activeMemoryDomain = null;
let _graph3dInitialized = false;
let _brainInitialized = false;
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-toggle button').forEach(function (b) {
        const label = b.textContent.toLowerCase();
        b.classList.toggle('active', label === view || (label === '3d' && view === 'graph3d'));
    });
    document.getElementById('graphArea').style.display = view === 'graph' ? '' : 'none';
    const graph3dArea = document.getElementById('graph3dWrapper');
    if (graph3dArea)
        graph3dArea.style.display = view === 'graph3d' ? 'flex' : 'none';
    const brainWrapper = document.getElementById('brainWrapper');
    if (brainWrapper)
        brainWrapper.style.display = view === 'brain' ? 'flex' : 'none';
    document.getElementById('memoryView').classList.toggle('visible', view === 'memories');
    document.getElementById('personalityView').classList.toggle('visible', view === 'personality');
    document.getElementById('sidebar').style.display = (view === 'graph' || view === 'graph3d') ? '' : 'none';
    const brainSidebar = document.getElementById('brainSidebar');
    if (brainSidebar)
        brainSidebar.style.display = view === 'brain' ? '' : 'none';
    const detailPanel = document.getElementById('detailPanel');
    detailPanel.style.display = view === 'personality' ? 'none' : '';
    detailPanel.style.flexShrink = '0';
    detailPanel.style.minWidth = view === 'personality' ? '' : '340px';
    if (view === 'memories' && !memoryData)
        loadMemories();
    if (view === 'personality' && !personalityData)
        loadPersonality();
    if (view === 'graph3d' && !_graph3dInitialized && typeof init3D === 'function') {
        init3D();
        _graph3dInitialized = true;
        const initialEgo = window.subjectNodeId;
        if (initialEgo) {
            load3DEgo(initialEgo);
        }
        else if (allSubgraphs.length > 0) {
            fetchJson('/subgraphs/' + allSubgraphs[0].id + '/nodes').then(function (nodes) {
                if (nodes && nodes.length > 0)
                    load3DEgo(nodes[0].id);
            });
        }
        if (typeof renderEgoBreadcrumb === 'function')
            renderEgoBreadcrumb();
    }
    if (view === 'brain' && !_brainInitialized && typeof initBrain === 'function') {
        initBrain();
        _brainInitialized = true;
        loadBrainView();
    }
}
async function loadMemories(domain) {
    const url = domain ? '/memories?domain=' + domain : '/memories';
    memoryData = await fetchJson(url);
    if (!memoryData)
        return;
    activeMemoryDomain = domain || null;
    renderMemoryFilters();
    renderMemoryList(memoryData.memories);
}
function renderMemoryFilters() {
    const filters = document.getElementById('memoryFilters');
    const counts = memoryData.domainCounts || {};
    let h = '<button class="domain-chip' + (!activeMemoryDomain ? ' active' : '') + '" onclick="loadMemories()">All<span class="count">' + memoryData.total + '</span></button>';
    for (const [d, count] of Object.entries(counts)) {
        const active = activeMemoryDomain === d ? ' active' : '';
        h += '<button class="domain-chip' + active + '" onclick="loadMemories(\'' + d + '\')">' + d + '<span class="count">' + count + '</span></button>';
    }
    filters.innerHTML = h;
}
const DOMAIN_COLORS = { experience: 'var(--activity)', relationship: 'var(--person)', reflection: 'var(--project)', mood: 'var(--pad-p)' };
function parseEmotions(str) {
    if (!str)
        return [];
    return str.split(',').map(s => { const [name, val] = s.split(':'); return { name: name.trim(), intensity: parseFloat(val) || 0 }; }).filter(e => e.name);
}
const EMOTION_TIPS = {
    joy: 'Pleased about a desirable event', distress: 'Displeased about an undesirable event',
    hope: 'Pleased about a prospective desirable event', fear: 'Displeased about a prospective undesirable event',
    pride: 'Self-approval for a praiseworthy action', shame: 'Self-disapproval for a blameworthy action',
    admiration: 'Approval of another\'s praiseworthy action', reproach: 'Disapproval of another\'s blameworthy action',
    love: 'Positive disposition toward an appealing object', hate: 'Negative disposition toward an unappealing object',
    'happy-for': 'Pleased about an event desirable for another', 'sorry-for': 'Displeased about an event undesirable for another',
    resentment: 'Displeased about an event desirable for another', gloating: 'Pleased about an event undesirable for another',
    gratitude: 'Approval of another\'s action combined with joy', anger: 'Disapproval of another\'s action combined with distress',
    gratification: 'Self-approval combined with joy about a desirable event', remorse: 'Self-disapproval combined with distress about an undesirable event',
    interest: 'Cognitive attraction toward a novel or complex stimulus', disgust: 'Revulsion toward an offensive object or situation',
    surprise: 'Reaction to an unexpected event', relief: 'Pleased that a feared event did not occur',
    humiliation: 'Shame intensified by public exposure', betrayal: 'Reproach combined with violated trust',
    grief: 'Intense distress from loss', shock: 'Extreme surprise from sudden negative event',
    horror: 'Fear combined with disgust', introspection: 'Self-directed cognitive examination',
};
const TENDENCY_TIPS = {
    approach: 'Move toward the stimulus', avoidance: 'Move away from the stimulus',
    attendance: 'Pay close attention, remain engaged', rejection: 'Push away, refuse to engage',
    nonattendance: 'Withdraw attention, disengage', antagonism: 'Oppose, confront, fight against',
    interruption: 'Break in, disrupt ongoing activity', dominance: 'Assert control over the situation',
    submission: 'Yield control, defer to others',
};
const DISTORTION_TIPS = {
    all_or_nothing: 'Seeing things in black-and-white, no middle ground', catastrophizing: 'Assuming the worst possible outcome',
    overgeneralization: 'Drawing broad conclusions from single events', mental_filter: 'Focusing only on negatives, filtering out positives',
    disqualifying_positive: 'Dismissing positive experiences as not counting', mind_reading: 'Assuming you know what others think',
    fortune_telling: 'Predicting negative outcomes without evidence', magnification: 'Exaggerating the importance of problems',
    emotional_reasoning: 'Treating feelings as facts', should_statements: 'Rigid rules about how things must be',
    labelling: 'Attaching fixed labels instead of describing behaviour', personalization: 'Taking responsibility for things outside your control',
};
function renderEmotionPills(emotions) {
    return emotions.map(e => {
        const cls = e.intensity >= 0.7 ? 'high' : e.intensity >= 0.4 ? 'mid' : 'low';
        const tip = EMOTION_TIPS[e.name] || '';
        return '<span class="emotion-pill ' + cls + '" title="' + tip + '" onclick="event.stopPropagation();exploreDimension(\'emotion\',\'' + e.name + '\')">' + e.name + ' ' + e.intensity.toFixed(2) + '</span>';
    }).join('');
}
function renderTendencyPill(name) {
    const tip = TENDENCY_TIPS[name.trim()] || '';
    return '<span class="tendency-pill" title="' + tip + '" onclick="event.stopPropagation();exploreDimension(\'tendency\',\'' + name.trim() + '\')">' + name.trim() + '</span>';
}
function renderDistortionPill(name) {
    const tip = DISTORTION_TIPS[name.trim()] || '';
    return '<span class="distortion-pill" title="' + tip + '" onclick="event.stopPropagation();exploreDimension(\'distortion\',\'' + name.trim() + '\')">' + name.trim() + '</span>';
}
function renderMemoryCard(m, clickable) {
    const domainColor = DOMAIN_COLORS[m.domain] || 'var(--text-muted)';
    const attrs = m.attributes || {};
    let h = '<div class="memory-card"' + (clickable ? ' onclick="showMemoryDetail(\'' + m.id + '\')"' : '') + '>';
    h += '<div class="domain-label" style="color:' + domainColor + '">' + m.domain + '</div>';
    h += '<div class="memory-text">' + autoLinkText(m.text) + '</div>';
    h += '<div class="memory-meta">';
    if (m.confidence)
        h += '<span class="attr-tag">conf: ' + m.confidence.toFixed(2) + '</span>';
    if (m.pleasure != null)
        h += '<span class="pad-mini pad-p">P:' + m.pleasure.toFixed(1) + '</span><span class="pad-mini pad-a">A:' + m.arousal.toFixed(1) + '</span><span class="pad-mini pad-d">D:' + m.dominance.toFixed(1) + '</span>';
    if (attrs['event-type'])
        h += '<span class="attr-tag">' + attrs['event-type'] + '</span>';
    if (attrs['period'])
        h += '<span class="attr-tag">' + attrs['period'] + '</span>';
    h += '</div>';
    const emotions = parseEmotions(attrs['occ-emotions']);
    if (emotions.length > 0) {
        h += '<div class="cog-summary">' + renderEmotionPills(emotions.slice(0, 4)) + '</div>';
    }
    const tendencies = (attrs['action-tendencies'] || '').split(',').filter(Boolean);
    const distortions = (attrs['cognitive-distortions'] || '').split(',').filter(Boolean);
    if (tendencies.length > 0 || distortions.length > 0) {
        h += '<div class="cog-summary">';
        h += tendencies.slice(0, 3).map(t => renderTendencyPill(t)).join('');
        h += distortions.slice(0, 2).map(d => renderDistortionPill(d)).join('');
        h += '</div>';
    }
    h += '</div>';
    return h;
}
function renderMemoryList(memories) {
    const list = document.getElementById('memoryList');
    if (!memories || memories.length === 0) {
        list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">No memories found</div>';
        return;
    }
    let h = '';
    for (const m of memories) {
        h += renderMemoryCard(m, true);
    }
    list.innerHTML = h;
}
let openSections = { emotions: true, sec: true, tendencies: true, distortions: true, drives: true, subthoughts: true };
let visibleSections = { reference: true, pad: true, emotions: true, sec: true, tendencies: true, distortions: true, drives: true, subthoughts: true };
function toggleSection(name) {
    openSections[name] = !openSections[name];
    const body = document.getElementById('cog-' + name);
    const arrow = document.getElementById('arrow-' + name);
    if (body)
        body.classList.toggle('open', openSections[name]);
    if (arrow)
        arrow.classList.toggle('open', openSections[name]);
}
function toggleVisibility(name) {
    visibleSections[name] = !visibleSections[name];
    const section = document.getElementById('section-' + name);
    if (section)
        section.style.display = visibleSections[name] ? '' : 'none';
    const btn = document.getElementById('filter-' + name);
    if (btn)
        btn.classList.toggle('active', visibleSections[name]);
}
function renderSectionFilters() {
    const labels = { reference: 'Reference', pad: 'PAD', emotions: 'Emotions', sec: 'SEC', tendencies: 'Tendencies', distortions: 'Distortions', drives: 'Drives', subthoughts: 'Sub-thoughts' };
    let h = '';
    for (const [key, label] of Object.entries(labels)) {
        const active = visibleSections[key] ? ' active' : '';
        const check = visibleSections[key] ? '✓' : '';
        h += '<button class="section-filter' + active + '" id="filter-' + key + '" onclick="toggleVisibility(\'' + key + '\')">'
            + '<span class="check">' + check + '</span>' + label + '</button>';
    }
    return '<div class="section-filters">' + h + '</div>';
}
function renderSecBar(label, value) {
    if (value == null)
        return '';
    const pct = Math.abs(value) * 100;
    const color = value < 0 ? '#f87171' : 'var(--accent)';
    return '<div class="sec-bar"><span class="sec-label">' + label + '</span><div class="sec-track"><div class="sec-fill" style="width:' + pct + '%;background:' + color + '"></div></div><span class="sec-val">' + (typeof value === 'number' ? value.toFixed(2) : value) + '</span></div>';
}
function renderDriveBar(label, value) {
    if (value == null)
        return '';
    const v = typeof value === 'number' ? value : parseFloat(value);
    const pct = Math.abs(v) * 50;
    const cls = v >= 0 ? 'positive' : 'negative';
    const offset = v >= 0 ? '50%' : (50 - pct) + '%';
    return '<div class="drive-row"><span class="drive-label">' + label + '</span><div class="drive-bar"><div class="drive-fill ' + cls + '" style="width:' + pct + '%;margin-left:' + offset + '"></div></div><span class="drive-val">' + v.toFixed(2) + '</span></div>';
}
function cogSection(name, title, content, count) {
    const isOpen = openSections[name];
    return '<div class="cog-section"><button class="cog-toggle" onclick="toggleSection(\'' + name + '\')">'
        + '<span class="arrow ' + (isOpen ? 'open' : '') + '" id="arrow-' + name + '">▶</span> '
        + title + (count != null ? ' <span style="opacity:0.5">(' + count + ')</span>' : '')
        + '</button><div class="cog-body ' + (isOpen ? 'open' : '') + '" id="cog-' + name + '">'
        + content + '</div></div>';
}
function showMemoryDetail(memoryId) {
    if (!memoryData)
        return;
    const m = memoryData.memories.find(mem => mem.id === memoryId);
    if (!m)
        return;
    const panel = document.getElementById('detailPanel');
    panel.className = 'detail-panel';
    const domainColor = DOMAIN_COLORS[m.domain] || 'var(--text-muted)';
    const attrs = m.attributes || {};
    let h = '<div class="detail-header"><h3>Memory</h3><span class="type-badge" style="background:' + domainColor + '22;color:' + domainColor + '">' + m.domain + '</span></div>';
    h += renderSectionFilters();
    h += '<div class="detail-section"><div style="font-size:13px;line-height:1.6;font-style:italic">' + autoLinkText(m.text) + '</div>';
    h += '<div style="margin-top:6px">';
    if (attrs['event-type'])
        h += '<span class="attr-tag">' + attrs['event-type'] + '</span> ';
    if (attrs['period'])
        h += '<span class="attr-tag">' + attrs['period'] + '</span> ';
    if (m.subject)
        h += '<span class="attr-tag">subject: ' + entityLink(m.subject) + '</span> ';
    if (attrs['other-agent'])
        h += '<span class="attr-tag">with: ' + entityLink(attrs['other-agent']) + '</span> ';
    const related = m.related_entities || (attrs['related-entities'] ? attrs['related-entities'].split(',') : []);
    for (const re of related) {
        if (re && re.trim())
            h += '<span class="attr-tag">' + entityLink(re.trim()) + '</span> ';
    }
    h += '</div></div>';
    if (m.pleasure != null) {
        h += '<div class="detail-section" id="section-pad" style="' + (visibleSections.pad ? '' : 'display:none') + '"><h4>Affect (PAD)</h4><div class="pad-pill">'
            + '<span class="pad-p">P ' + m.pleasure.toFixed(2) + '</span>'
            + '<span class="pad-a">A ' + m.arousal.toFixed(2) + '</span>'
            + '<span class="pad-d">D ' + m.dominance.toFixed(2) + '</span>'
            + '</div></div>';
    }
    const emotions = parseEmotions(attrs['occ-emotions']);
    if (emotions.length > 0) {
        h += '<div class="detail-section" id="section-emotions" style="' + (visibleSections.emotions ? '' : 'display:none') + '">'
            + cogSection('emotions', 'OCC Emotions', '<div class="emotion-grid">' + renderEmotionPills(emotions) + '</div>', emotions.length)
            + '</div>';
    }
    const secDims = ['relevance', 'novelty', 'urgency', 'conduciveness', 'controllability', 'adjustability', 'internal_standards', 'external_standards'];
    let secHtml = '';
    let secCount = 0;
    for (const dim of secDims) {
        const val = attrs['sec-' + dim];
        if (val != null) {
            secHtml += renderSecBar(dim.replace('_', ' '), parseFloat(val));
            secCount++;
        }
    }
    if (secCount > 0) {
        h += '<div class="detail-section" id="section-sec" style="' + (visibleSections.sec ? '' : 'display:none') + '">'
            + cogSection('sec', 'SEC Appraisal', secHtml, secCount) + '</div>';
    }
    const tendencies = (attrs['action-tendencies'] || '').split(',').filter(Boolean);
    if (tendencies.length > 0) {
        const tHtml = '<div class="emotion-grid">' + tendencies.map(t => renderTendencyPill(t)).join('') + '</div>';
        h += '<div class="detail-section" id="section-tendencies" style="' + (visibleSections.tendencies ? '' : 'display:none') + '">'
            + cogSection('tendencies', 'Action Tendencies', tHtml, tendencies.length) + '</div>';
    }
    const distortions = (attrs['cognitive-distortions'] || '').split(',').filter(Boolean);
    if (distortions.length > 0) {
        const dHtml = '<div class="emotion-grid">' + distortions.map(d => renderDistortionPill(d)).join('') + '</div>';
        h += '<div class="detail-section" id="section-distortions" style="' + (visibleSections.distortions ? '' : 'display:none') + '">'
            + cogSection('distortions', 'Cognitive Distortions', dHtml, distortions.length) + '</div>';
    }
    const driveStr = attrs['drive-impact'];
    if (driveStr) {
        let drivesHtml = '';
        let driveCount = 0;
        for (const pair of driveStr.split(',')) {
            const [axis, val] = pair.split(':');
            if (axis && val) {
                drivesHtml += renderDriveBar(axis.trim(), val);
                driveCount++;
            }
        }
        if (driveCount > 0) {
            h += '<div class="detail-section" id="section-drives" style="' + (visibleSections.drives ? '' : 'display:none') + '">'
                + cogSection('drives', 'Drive Impact', drivesHtml, driveCount) + '</div>';
        }
    }
    const stStr = attrs['sub-thoughts'];
    if (stStr) {
        const thoughts = stStr.split('|').filter(Boolean);
        let stHtml = '';
        for (const st of thoughts) {
            const parts = st.split('::');
            const stType = parts[0] || '';
            const stText = parts[1] || '';
            stHtml += '<div class="sub-thought"><span class="sub-thought-type">' + stType + '</span>';
            if (stText)
                stHtml += '<span>' + autoLinkText(stText) + '</span>';
            stHtml += '</div>';
        }
        h += '<div class="detail-section" id="section-subthoughts" style="' + (visibleSections.subthoughts ? '' : 'display:none') + '">'
            + cogSection('subthoughts', 'Sub-thoughts', stHtml, thoughts.length) + '</div>';
    }
    if (m.confidence) {
        h += '<div class="detail-section"><h4>Confidence</h4><div style="font-size:12px">' + m.confidence.toFixed(2) + '</div></div>';
    }
    panel.innerHTML = h;
}
// -- Personality view --
let personalityData = null;
async function loadPersonality() {
    personalityData = await fetchJson('/personality');
    renderPersonality();
}
function renderPersonality() {
    const el = document.getElementById('personalityContent');
    if (!personalityData || !personalityData.available) {
        el.innerHTML = '<div class="personality-empty">No cognitive profile registered for this agent. Seed the corpus to derive personality.</div>';
        return;
    }
    let h = '';
    if (personalityData.disposition) {
        const axes = personalityData.disposition;
        const axisLabels = {
            socialOrient: { label: 'Social Orient', colors: { extrovert: '#f472b6', introvert: '#6366f1' } },
            ruleFollowing: { label: 'Rule Following', colors: { strict: '#ef4444', flexible: '#34d399' } },
            riskAppetite: { label: 'Risk Appetite', colors: { bold: '#f97316', cautious: '#60a5fa' } },
            autonomy: { label: 'Autonomy', colors: { high: '#a78bfa', low: '#94a3b8' } },
            conflictMode: { label: 'Conflict Mode', colors: { confrontational: '#ef4444', avoidant: '#60a5fa' } },
        };
        h += '<div class="personality-card"><h3>Disposition Axes</h3>';
        for (const [key, cfg] of Object.entries(axisLabels)) {
            const val = axes[key] || '—';
            const color = cfg.colors[val] || 'var(--accent)';
            h += '<div class="axis-row"><span class="axis-label">' + cfg.label + '</span>'
                + '<span class="axis-value" style="background:' + color + '18;color:' + color + '">' + val + '</span></div>';
        }
        h += '</div>';
    }
    h += '<div class="personality-grid">';
    if (personalityData.moodBaseline) {
        const mb = personalityData.moodBaseline;
        h += '<div class="personality-card"><h3>Mood Baseline</h3>'
            + '<div class="pad-pill" style="font-size:13px;gap:8px">'
            + '<span class="pad-p" style="padding:4px 10px">P ' + mb.pleasure.toFixed(2) + '</span>'
            + '<span class="pad-a" style="padding:4px 10px">A ' + mb.arousal.toFixed(2) + '</span>'
            + '<span class="pad-d" style="padding:4px 10px">D ' + mb.dominance.toFixed(2) + '</span>'
            + '</div>'
            + padInterpretation(mb)
            + '</div>';
    }
    if (personalityData.personalityWeights) {
        const weights = personalityData.personalityWeights;
        const domainColors = {
            experience: 'var(--activity)', relationship: 'var(--person)',
            reflection: 'var(--project)', mood: 'var(--pad-p)',
            engagement: '#fbbf24',
        };
        h += '<div class="personality-card"><h3>Domain Weights</h3>';
        const maxWeight = Math.max(...Object.values(weights), 1.0);
        const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
        for (const [domain, weight] of sorted) {
            const pct = (weight / maxWeight) * 100;
            const color = domainColors[domain] || 'var(--accent)';
            h += '<div class="weight-row"><span class="weight-label">' + domain + '</span>'
                + '<div class="weight-track"><div class="weight-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
                + '<span class="weight-val">' + weight.toFixed(2) + '</span></div>';
        }
        h += '</div>';
    }
    if (personalityData.appraisalWeights) {
        const aw = personalityData.appraisalWeights;
        h += '<div class="personality-card"><h3>Appraisal Weights</h3>';
        const appraisalFields = [
            { key: 'urgencyWeight', label: 'Urgency', color: '#ef4444' },
            { key: 'relationshipWeight', label: 'Relationship', color: 'var(--person)' },
            { key: 'fearOnsetThreshold', label: 'Fear onset', color: '#f97316' },
            { key: 'selfStandardsStrictness', label: 'Self standards', color: 'var(--accent)' },
            { key: 'otherStandardsStrictness', label: 'Other standards', color: 'var(--project)' },
        ];
        for (const f of appraisalFields) {
            const val = aw[f.key];
            const pct = Math.min(val / 2.0, 1.0) * 100;
            h += '<div class="weight-row"><span class="weight-label">' + f.label + '</span>'
                + '<div class="weight-track"><div class="weight-fill" style="width:' + pct + '%;background:' + f.color + '"></div></div>'
                + '<span class="weight-val">' + val.toFixed(2) + '</span></div>';
        }
        h += '</div>';
    }
    if (personalityData.habituation) {
        const hab = personalityData.habituation;
        h += '<div class="personality-card"><h3>Habituation</h3>';
        const habFields = [
            { key: 'habituationRate', label: 'Habituation rate', desc: 'Speed of novelty decay' },
            { key: 'noveltyThreshold', label: 'Novelty threshold', desc: 'Minimum for novel stimulus' },
            { key: 'repetitionTolerance', label: 'Repetition tolerance', desc: 'Before boredom' },
        ];
        for (const f of habFields) {
            const val = hab[f.key];
            h += '<div class="weight-row"><span class="weight-label" title="' + f.desc + '">' + f.label + '</span>'
                + '<div class="weight-track"><div class="weight-fill" style="width:' + (val * 100) + '%;background:var(--accent)"></div></div>'
                + '<span class="weight-val">' + val.toFixed(2) + '</span></div>';
        }
        h += '</div>';
    }
    if (personalityData.cbrStrategy) {
        const cbr = personalityData.cbrStrategy;
        h += '<div class="personality-card"><h3>CBR Strategy</h3>';
        h += '<div class="axis-row"><span class="axis-label">Retrieval mode</span>'
            + '<span class="axis-value">' + cbr.retrievalMode + '</span></div>';
        h += '<div class="axis-row"><span class="axis-label">Min similarity</span>'
            + '<span class="axis-value">' + cbr.minSimilarity.toFixed(2) + '</span></div>';
        h += '<div class="axis-row"><span class="axis-label">Temporal decay</span>'
            + '<span class="axis-value">' + cbr.temporalDecayDays + ' days</span></div>';
        h += '</div>';
    }
    if (personalityData.socialCognition) {
        const sc = personalityData.socialCognition;
        h += '<div class="personality-card"><h3>Social Cognition</h3>';
        h += '<div class="weight-row"><span class="weight-label">Trust formation</span>'
            + '<div class="weight-track"><div class="weight-fill" style="width:' + (sc.trustFormationRate * 100) + '%;background:var(--pad-p)"></div></div>'
            + '<span class="weight-val">' + sc.trustFormationRate.toFixed(2) + '</span></div>';
        h += '<div class="axis-row"><span class="axis-label">Conflict style</span>'
            + '<span class="axis-value">' + sc.conflictInterpretation + '</span></div>';
        h += '</div>';
    }
    if (personalityData.graphStructure) {
        const gs = personalityData.graphStructure;
        h += '<div class="personality-card"><h3>Graph Structure</h3>';
        h += '<div class="axis-row"><span class="axis-label">Inference style</span>'
            + '<span class="axis-value">' + gs.inferenceStyle + '</span></div>';
        h += '<div class="weight-row"><span class="weight-label">Connective bias</span>'
            + '<div class="weight-track"><div class="weight-fill" style="width:' + (gs.connectiveBias * 100) + '%;background:var(--project)"></div></div>'
            + '<span class="weight-val">' + gs.connectiveBias.toFixed(2) + '</span></div>';
        h += '</div>';
    }
    if (personalityData.extractionBias) {
        const eb = personalityData.extractionBias;
        h += '<div class="personality-card"><h3>Extraction Bias</h3>';
        const ebFields = [
            { key: 'relationshipBias', label: 'Relationship focus', color: 'var(--person)' },
            { key: 'affectSensitivity', label: 'Affect sensitivity', color: 'var(--pad-a)' },
        ];
        for (const f of ebFields) {
            const val = eb[f.key];
            const pct = Math.min(val / 2.0, 1.0) * 100;
            h += '<div class="weight-row"><span class="weight-label">' + f.label + '</span>'
                + '<div class="weight-track"><div class="weight-fill" style="width:' + pct + '%;background:' + f.color + '"></div></div>'
                + '<span class="weight-val">' + val.toFixed(2) + '</span></div>';
        }
        h += '</div>';
    }
    h += '</div>';
    if (personalityData.dispositionProfile && personalityData.dispositionProfile.length > 0) {
        h += '<div class="personality-card"><h3>Disposition Profile</h3><div class="emotion-grid">';
        for (const t of personalityData.dispositionProfile) {
            const opacity = 0.3 + t.weight * 0.7;
            h += '<span class="emotion-pill" style="opacity:' + opacity + '">' + t.term + ' ' + t.weight.toFixed(2) + '</span>';
        }
        h += '</div></div>';
    }
    el.innerHTML = h;
}
function padInterpretation(pad) {
    const labels = [];
    if (pad.pleasure > 0.3)
        labels.push('positive');
    else if (pad.pleasure < -0.3)
        labels.push('negative');
    else
        labels.push('neutral');
    if (pad.arousal > 0.3)
        labels.push('energized');
    else if (pad.arousal < -0.3)
        labels.push('calm');
    if (pad.dominance > 0.3)
        labels.push('assertive');
    else if (pad.dominance < -0.3)
        labels.push('yielding');
    if (labels.length === 0)
        return '';
    return '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">Baseline: ' + labels.join(', ') + '</div>';
}
init();
