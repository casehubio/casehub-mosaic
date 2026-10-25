async function fetchBrainData(): Promise<BrainResponse | null> {
  const r = await fetch('/api/workbench/brain');
  return r.ok ? r.json() as Promise<BrainResponse> : null;
}

function toBrainGraph(response: BrainResponse): { nodes: BrainNode[]; links: BrainLink[] } {
  const nodes: BrainNode[] = [];
  const links: BrainLink[] = [];

  for (const region of response.regions) {
    for (const node of region.nodes) {
      nodes.push({
        id: node.id, name: node.name || node.id, regionId: region.regionId,
        nodeType: 'entity', subgraphType: node.subgraphType,
        pleasure: node.pleasure, arousal: node.arousal, dominance: node.dominance,
        confidenceValue: node.confidenceValue,
      });
    }
  }

  for (const cn of response.capsNodes) {
    nodes.push({
      id: 'caps-' + cn.id, name: cn.id, regionId: 'habitual',
      nodeType: 'caps', capsType: cn.type,
    });
  }

  for (const mood of response.moodSnapshots) {
    nodes.push({
      id: 'mood-' + mood.id, name: 'Mood', regionId: 'limbic',
      nodeType: 'mood', pleasure: mood.pleasure, arousal: mood.arousal,
      dominance: mood.dominance, confidenceValue: mood.confidence,
    });
  }

  for (const ap of response.affectProjections) {
    nodes.push({
      id: ap.id, name: ap.sourceName + ' (affect)', regionId: 'limbic',
      nodeType: 'affect', sourceNodeId: ap.sourceNodeId,
      pleasure: ap.pleasure, arousal: ap.arousal, dominance: ap.dominance,
    });
    links.push({
      source: ap.sourceNodeId, target: ap.id,
      type: 'affect-projection', linkType: 'affect',
    });
  }

  for (const edge of response.edges) {
    links.push({
      source: edge.sourceNodeId, target: edge.targetNodeId,
      type: edge.edgeType || 'related', linkType: 'entity',
    });
  }

  for (const cc of response.capsConnections) {
    links.push({
      source: 'caps-' + cc.from, target: 'caps-' + cc.to,
      type: 'caps-connection', linkType: 'caps',
    });
  }

  return { nodes, links };
}
