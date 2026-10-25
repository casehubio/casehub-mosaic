let _brainRegionStates: Map<string, BrainRegionState> = new Map();

function initBrainRegions(
  regions: BrainRegionData[],
  boundsMap: Map<string, RegionBounds>,
): void {
  _brainRegionStates = new Map();
  for (const region of regions) {
    const bounds = boundsMap.get(region.regionId);
    if (!bounds) continue;
    _brainRegionStates.set(region.regionId, {
      regionId: region.regionId,
      functionalLabel: region.functionalLabel,
      anatomicalLabel: region.anatomicalLabel,
      active: false,
      nodeCount: region.nodes.length,
      bounds,
    });
  }
}

function toggleBrainRegion(regionId: string): void {
  const state = _brainRegionStates.get(regionId);
  if (state) state.active = !state.active;
}

function activeBrainRegions(): string[] {
  return [..._brainRegionStates.values()].filter(s => s.active).map(s => s.regionId);
}

function allBrainRegions(): BrainRegionState[] {
  return [..._brainRegionStates.values()];
}

function isBrainRegionActive(regionId: string): boolean {
  const active = activeBrainRegions();
  if (active.length === 0) return true;
  return active.includes(regionId);
}
