export type CompletionSignal = 'exists' | 'configured' | 'tested' | 'deployed';
export type CompletionStatus = 'done' | 'partial' | 'missing';

export interface LayerCompletion {
  readonly layerId: string;
  readonly layerLabel: string;
  readonly layerIcon: string;
  readonly signals: Record<CompletionSignal, CompletionStatus>;
  readonly nextAction?: string;
}

export interface CompletenessMatrixData {
  readonly layers: readonly LayerCompletion[];
}
