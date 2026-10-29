export type TopologyNodeStatus = 'RUNNING' | 'DEGRADED' | 'DEPLOYING' | 'FAULTED' | 'ABSENT';

export type DeploymentStrategy = 'rolling' | 'canary' | 'blue-green';

export interface TopologyNode {
  readonly id: string;
  readonly name: string;
  readonly status: TopologyNodeStatus;
  readonly replicas?: number;
  readonly image?: string;
  readonly type?: string;
  readonly deploymentStrategy?: DeploymentStrategy;
  readonly cluster?: string;
  readonly forEachSource?: string;
}

export interface TopologyEdge {
  readonly source: string;
  readonly target: string;
  readonly label?: string;
}

export interface ClusterGroup {
  readonly id: string;
  readonly name: string;
  readonly region?: string;
}

export interface TopologySnapshot {
  readonly services: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
  readonly clusters?: readonly ClusterGroup[];
}
