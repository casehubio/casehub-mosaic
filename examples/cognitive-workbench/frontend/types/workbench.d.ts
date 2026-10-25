// Shared types for the cognitive workbench

// --- API DTOs ---

interface SubgraphDto {
  id: string;
  name: string;
  type: string;
}

interface NodeDto {
  id: string;
  name: string;
  subgraphType: string;
  confidenceValue: number | null;
  confidenceOrigin: string | null;
  pleasure: number | null;
  arousal: number | null;
  dominance: number | null;
  validFrom: string | null;
  validUntil: string | null;
  properties: Record<string, string>;
  bfsDepth?: number;
}

interface EdgeDto {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
}

interface StatusDto {
  tenantId: string;
  agentId: string;
  seeded: boolean;
  subjectName: string;
}

interface MemoryDto {
  id: string;
  text: string;
  domain: string;
  confidence: number;
  attributes: Record<string, string>;
  pleasure: number | null;
  arousal: number | null;
  dominance: number | null;
  subject: string | null;
  related_entities?: string[];
}

interface MemoryResponse {
  memories: MemoryDto[];
  domainCounts: Record<string, number>;
  total: number;
}

interface CognitiveProfileDto {
  memoryCount: number;
  pad?: { pleasure: number; arousal: number; dominance: number; sampleCount: number };
  emotions?: Array<{ emotion: string; avgIntensity: number; occurrences: number }>;
  tendencies?: Array<{ tendency: string; count: number }>;
  distortions?: Array<{ distortion: string; count: number }>;
  drives?: Record<string, { avgImpact: number; sampleCount: number }>;
  sec?: Record<string, number>;
}

interface PersonalityDto {
  available: boolean;
  agentId?: string;
  disposition?: {
    socialOrient: string;
    ruleFollowing: string;
    riskAppetite: string;
    autonomy: string;
    conflictMode: string;
  };
  dispositionProfile?: Array<{ term: string; weight: number }>;
  personalityWeights?: Record<string, number>;
  moodBaseline?: { pleasure: number; arousal: number; dominance: number };
  appraisalWeights?: {
    urgencyWeight: number;
    relationshipWeight: number;
    fearOnsetThreshold: number;
    selfStandardsStrictness: number;
    otherStandardsStrictness: number;
  };
  habituation?: {
    habituationRate: number;
    noveltyThreshold: number;
    repetitionTolerance: number;
  };
  cbrStrategy?: {
    minSimilarity: number;
    temporalDecayDays: number;
    retrievalMode: string;
  };
  socialCognition?: {
    trustFormationRate: number;
    conflictInterpretation: string;
  };
  graphStructure?: {
    inferenceStyle: string;
    connectiveBias: number;
  };
  extractionBias?: {
    relationshipBias: number;
    affectSensitivity: number;
  };
}

interface ReferenceOverlayEntry {
  description?: string;
  context?: string;
}

interface DimensionEntity {
  name: string;
  totalScore: number;
  occurrences: number;
  subgraphType?: string;
}

interface DimensionResponse {
  dimension: string;
  value: string;
  entities: DimensionEntity[];
  totalEntities: number;
}

// --- CAPS types ---

interface CapsTopologyDto {
  version: string;
  nodes: CapsNodeDto[];
  connections: CapsConnectionDto[];
}

interface CapsNodeDto {
  id: string;
  type: 'INPUT' | 'MEDIATING' | 'OUTPUT';
  category: string;
  keywords?: string[];
  sourceModels?: string[];
}

interface CapsConnectionDto {
  from: string;
  to: string;
  weight: number;
  psychologicalSource?: string;
}

interface ExperienceLinkDto {
  capsNodeId: string;
  entity: string;
  confidence: number;
  memoryCount: number;
}

// --- Evaluation types ---

interface SituationActivation {
  nodeId: string;
  confidence: number;
}

interface BehavioralAttractor {
  category: string;
  strength: number;
}

interface EvaluationResult {
  evaluationId: string;
  mentionedEntities: string[];
  caps: {
    activations: Record<string, number>;
    iterations: number;
    convergence: string;
    saturationRatio: number;
    attractors: BehavioralAttractor[];
  };
  situationActivations: SituationActivation[];
  appraisal?: {
    available: boolean;
    narrative?: string;
    emotions?: Array<{ type: string; intensity: number }>;
    actionTendencies?: Array<{ readiness: string; intensity: number }>;
  };
}

// --- Internal view types ---

interface SimNode {
  id: string;
  x: number;
  y: number;
  name: string;
  type: string;
  confidence: number;
  fixed?: boolean;
  labelY?: number;
  _displayName?: string;
  pleasure?: number;
  arousal?: number;
  dominance?: number;
}

interface SimEdge {
  source: SimNode;
  target: SimNode;
  type: string;
  id: string;
}

interface EgoData {
  focusNodeId: string;
  depth: number;
  nodes: NodeDto[];
  edges: EdgeDto[];
  capped: boolean;
  maxNodes: number;
  error?: string;
}

interface ParsedEmotion {
  name: string;
  intensity: number;
}

// --- Graph3D specific types ---

interface Graph3DNode {
  id: string;
  name: string;
  subgraphType: string;
  confidenceValue: number;
  bfsDepth: number;
  _isEgo: boolean;
  _capsNode: boolean;
  _capsType?: string;
  _capsCategory?: string;
  _emissive: number;
  _highlighted?: boolean;
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface Graph3DLink {
  source: string | Graph3DNode;
  target: string | Graph3DNode;
  type: string;
  id?: string;
  _synthetic: boolean;
  _capsEdge: boolean;
  _focused?: boolean;
  _confidence?: number;
  _memoryCount?: number;
  _activation?: number;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

// --- Brain mesh types (globals set by brain-mesh.js module) ---

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Plane {
  normal: Vec3;
  offset: number;
}

interface RegionBounds {
  planes: Plane[];
  center: Vec3;
  color: string;
}

interface BrainMesh {
  vertices: Float32Array;
  indices: Uint16Array;
  regionBounds: Map<string, RegionBounds>;
}

declare function createBrainMesh(scale: number): BrainMesh;
declare function isInsideRegion(point: Vec3, region: RegionBounds): boolean;
declare function computeScale(regionNodeCounts: Map<string, number>, targetSpacing: number): number;
declare var REGION_IDS: readonly string[];

// --- Brain data types ---

interface BrainRegionData {
  regionId: string;
  functionalLabel: string;
  anatomicalLabel: string;
  subgraphTypes: string[];
  nodes: NodeDto[];
}

interface BrainMoodNode {
  id: string;
  pleasure: number | null;
  arousal: number | null;
  dominance: number | null;
  confidence: number | null;
  timestamp: string | null;
}

interface BrainAffectProjection {
  id: string;
  sourceNodeId: string;
  sourceName: string;
  sourceRegion: string;
  pleasure: number | null;
  arousal: number | null;
  dominance: number | null;
}

interface BrainResponse {
  regions: BrainRegionData[];
  edges: EdgeDto[];
  moodSnapshots: BrainMoodNode[];
  affectProjections: BrainAffectProjection[];
  capsNodes: CapsNodeDto[];
  capsConnections: CapsConnectionDto[];
  nodeCount: number;
  capped: boolean;
}

interface BrainNode {
  id: string;
  name: string;
  regionId: string;
  nodeType: 'entity' | 'caps' | 'mood' | 'affect';
  subgraphType?: string;
  capsType?: string;
  pleasure?: number | null;
  arousal?: number | null;
  dominance?: number | null;
  confidenceValue?: number | null;
  sourceNodeId?: string;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

interface BrainLink {
  source: string;
  target: string;
  type: string;
  linkType: 'entity' | 'caps' | 'affect';
}

interface BrainRegionState {
  regionId: string;
  functionalLabel: string;
  anatomicalLabel: string;
  active: boolean;
  nodeCount: number;
  bounds: RegionBounds;
}

// --- Brain function declarations ---

declare function fetchBrainData(): Promise<BrainResponse | null>;
declare function toBrainGraph(response: BrainResponse): { nodes: BrainNode[]; links: BrainLink[] };
declare function initBrain(): void;
declare function loadBrainView(): Promise<void>;
declare function toggleBrainFilter(regionId: string): void;
declare function initBrainRegions(regions: BrainRegionData[], boundsMap: Map<string, RegionBounds>): void;
declare function toggleBrainRegion(regionId: string): void;
declare function allBrainRegions(): BrainRegionState[];
declare function isBrainRegionActive(regionId: string): boolean;
declare function focusBrainNode(nodeId: string): void;
declare function returnToBrain(): void;
