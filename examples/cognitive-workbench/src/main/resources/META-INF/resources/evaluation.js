"use strict";
// Scenario evaluation panel + signal flow animation + evaluation detail rendering
let lastEvalId = null;
let lastEvalResult = null;
async function evaluateScenario() {
    const text = document.getElementById('evalInput').value.trim();
    if (!text)
        return;
    document.getElementById('evalStatus').textContent = 'Evaluating...';
    document.getElementById('evalBtn').disabled = true;
    const commitBtn = document.getElementById('commitBtn');
    commitBtn.disabled = true;
    commitBtn.textContent = 'Commit';
    commitBtn.style.background = 'var(--surface-2)';
    commitBtn.style.color = 'var(--text-muted)';
    try {
        const resp = await fetch(API + '/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const result = await resp.json();
        if (!resp.ok) {
            document.getElementById('evalStatus').textContent = 'Error: ' + (result.error || resp.status);
            return;
        }
        lastEvalId = result.evaluationId;
        lastEvalResult = result;
        const statusParts = [];
        statusParts.push('CAPS: ' + result.caps.convergence + ' (' + result.caps.iterations + ' iters)');
        statusParts.push(result.situationActivations.length + ' activations');
        statusParts.push(result.mentionedEntities.length + ' entities');
        if (result.caps.attractors.length > 0) {
            statusParts.push('attractors: ' + result.caps.attractors.map(function (a) { return a.category; }).join(', '));
        }
        if (result.appraisal && result.appraisal.available) {
            statusParts.push(result.appraisal.emotions.length + ' emotions');
        }
        document.getElementById('evalStatus').textContent = statusParts.join(' | ');
        commitBtn.disabled = false;
        commitBtn.style.color = 'var(--text)';
        animateEvaluation(result);
    }
    catch (err) {
        document.getElementById('evalStatus').textContent = 'Error: ' + err.message;
    }
    finally {
        document.getElementById('evalBtn').disabled = false;
    }
}
async function commitEvaluation() {
    if (!lastEvalId)
        return;
    const commitBtn = document.getElementById('commitBtn');
    commitBtn.disabled = true;
    try {
        const resp = await fetch(API + '/evaluate/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evaluationId: lastEvalId })
        });
        if (resp.status === 409) {
            document.getElementById('evalStatus').textContent += ' | Already committed';
            return;
        }
        if (resp.status === 404) {
            document.getElementById('evalStatus').textContent += ' | Evaluation expired';
            return;
        }
        const result = await resp.json();
        document.getElementById('evalStatus').textContent += ' | Committed: ' + result.memoryId;
        commitBtn.style.background = 'var(--pad-p)';
        commitBtn.style.color = 'white';
        commitBtn.textContent = 'Committed';
    }
    catch (_err) {
        document.getElementById('evalStatus').textContent += ' | Commit failed';
        commitBtn.disabled = false;
    }
}
// --- Signal flow animation ---
function animateEvaluation(result) {
    if (!graph3d)
        return;
    if (!capsVisible)
        setCapsVisible(true);
    const currentData = graph3d.graphData();
    const mindMapNodes = currentData.nodes;
    const existingLinks = currentData.links.filter(function (l) { return !l._synthetic; });
    const syntheticLinks = [];
    for (let i = 0; i < result.mentionedEntities.length; i++) {
        const entity = result.mentionedEntities[i];
        const entityNode = mindMapNodes.find(function (n) { return n.name && n.name.toLowerCase() === entity; });
        if (!entityNode)
            continue;
        for (let j = 0; j < result.situationActivations.length; j++) {
            const act = result.situationActivations[j];
            syntheticLinks.push({
                source: entityNode.id,
                target: 'caps-' + act.nodeId,
                type: 'activates',
                _synthetic: true,
                _capsEdge: false,
                _activation: act.confidence
            });
        }
    }
    graph3d.graphData({ nodes: mindMapNodes, links: existingLinks.concat(syntheticLinks) });
    graph3d
        .linkDirectionalParticles(function (link) {
        if (link._synthetic)
            return 4;
        if (link._capsEdge && capsVisible)
            return 2;
        return 0;
    })
        .linkDirectionalParticleSpeed(function (link) {
        if (link._synthetic)
            return 0.008 * (link._activation || 1);
        if (link._capsEdge)
            return 0.004;
        return 0;
    })
        .linkDirectionalParticleWidth(function (link) {
        return link._synthetic ? 2 : (link._capsEdge ? 1 : 0);
    })
        .linkDirectionalParticleColor(function (link) {
        if (link._synthetic)
            return '#6366f1';
        if (link._capsEdge)
            return '#94a3b8';
        return null;
    });
    const activations = result.caps.activations;
    const mentionedSet = {};
    for (let k = 0; k < result.mentionedEntities.length; k++) {
        mentionedSet[result.mentionedEntities[k]] = true;
    }
    const startTime = Date.now();
    function animateFrame() {
        const elapsed = (Date.now() - startTime) / 1000;
        graph3d.nodeThreeObject(function (node) {
            let emissive = 0.2;
            if (node._capsNode) {
                const capsId = node.id.replace('caps-', '');
                const activation = activations[capsId];
                if (activation != null && elapsed > 1) {
                    emissive = 0.2 + Math.abs(activation) * 0.8;
                }
            }
            else if (mentionedSet[node.name?.toLowerCase()] && elapsed < 3) {
                emissive = 0.5 + 0.3 * Math.sin(elapsed * 3);
            }
            node._emissive = emissive;
            return (typeof buildNodeObject === 'function') ? buildNodeObject(node) : undefined;
        });
        if (elapsed < 6) {
            requestAnimationFrame(animateFrame);
        }
    }
    animateFrame();
    showEvaluationInPanel(result);
}
// --- Evaluation detail in panel ---
function showEvaluationInPanel(result) {
    const panel = document.getElementById('detailPanel');
    panel.className = 'detail-panel';
    let h = '';
    h += '<div class="detail-header" style="border-left-color:var(--accent)">';
    h += '<h3>Evaluation Result</h3>';
    h += '<span class="type-badge" style="background:rgba(99,102,241,0.1);color:var(--accent)">' + result.caps.convergence + '</span>';
    h += '</div>';
    h += '<div class="detail-section"><h4>Scenario</h4>';
    h += '<div style="font-size:13px;font-style:italic;line-height:1.5">' + (lastEvalResult ? document.getElementById('evalInput').value : '') + '</div>';
    if (result.mentionedEntities.length > 0) {
        h += '<div style="margin-top:6px">';
        for (let i = 0; i < result.mentionedEntities.length; i++) {
            h += '<span class="attr-tag" style="margin-right:4px">' + result.mentionedEntities[i] + '</span>';
        }
        h += '</div>';
    }
    h += '</div>';
    h += '<div class="detail-section"><h4>CAPS Settling</h4>';
    h += '<div class="prop-row"><span class="prop-key">Convergence</span>' + result.caps.convergence + '</div>';
    h += '<div class="prop-row"><span class="prop-key">Iterations</span>' + result.caps.iterations + '</div>';
    h += '<div class="prop-row"><span class="prop-key">Saturation</span>' + (result.caps.saturationRatio * 100).toFixed(1) + '%</div>';
    h += '</div>';
    if (result.caps.attractors.length > 0) {
        h += '<div class="detail-section"><h4>Behavioral Attractors</h4>';
        h += '<div class="emotion-grid">';
        for (let a = 0; a < result.caps.attractors.length; a++) {
            const attr = result.caps.attractors[a];
            h += '<span class="tendency-pill">' + attr.category + ' ' + attr.strength.toFixed(2) + '</span> ';
        }
        h += '</div></div>';
    }
    if (result.situationActivations.length > 0) {
        h += '<div class="detail-section"><h4>CAPS Input Activations</h4>';
        for (let s = 0; s < result.situationActivations.length; s++) {
            const sa = result.situationActivations[s];
            h += renderSecBar(sa.nodeId, sa.confidence);
        }
        h += '</div>';
    }
    const topActivations = Object.entries(result.caps.activations)
        .sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); })
        .slice(0, 10);
    if (topActivations.length > 0) {
        h += '<div class="detail-section"><h4>Top Node Activations</h4>';
        for (let t = 0; t < topActivations.length; t++) {
            h += renderSecBar(topActivations[t][0], topActivations[t][1]);
        }
        h += '</div>';
    }
    if (result.appraisal && result.appraisal.available) {
        if (result.appraisal.narrative) {
            h += '<div class="detail-section"><h4>Felt State</h4>';
            h += '<div style="font-size:12px;font-style:italic;line-height:1.5;color:var(--text)">"' + result.appraisal.narrative + '"</div>';
            h += '</div>';
        }
        if (result.appraisal.emotions && result.appraisal.emotions.length > 0) {
            h += '<div class="detail-section"><h4>OCC Emotions</h4>';
            h += '<div class="emotion-grid">';
            for (let e = 0; e < result.appraisal.emotions.length; e++) {
                const emo = result.appraisal.emotions[e];
                const cls = emo.intensity >= 0.7 ? 'high' : emo.intensity >= 0.4 ? 'mid' : 'low';
                h += '<span class="emotion-pill ' + cls + '">' + emo.type + ' ' + emo.intensity.toFixed(2) + '</span> ';
            }
            h += '</div></div>';
        }
        if (result.appraisal.actionTendencies && result.appraisal.actionTendencies.length > 0) {
            h += '<div class="detail-section"><h4>Action Tendencies</h4>';
            h += '<div class="emotion-grid">';
            for (let at = 0; at < result.appraisal.actionTendencies.length; at++) {
                const tend = result.appraisal.actionTendencies[at];
                h += '<span class="tendency-pill">' + tend.readiness + ' ' + tend.intensity.toFixed(2) + '</span> ';
            }
            h += '</div></div>';
        }
    }
    panel.innerHTML = h;
}
