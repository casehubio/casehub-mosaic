export type LayerHealth = 'healthy' | 'degraded' | 'incomplete';

export interface LayerMetric {
  readonly label: string;
  readonly value: number | string;
}

export interface LayerSummary {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly total: number;
  readonly completed: number;
  readonly health: LayerHealth;
  readonly metrics?: readonly LayerMetric[];
}

export interface ProjectDashboardData {
  readonly projectName: string;
  readonly layers: readonly LayerSummary[];
}
