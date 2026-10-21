import type { AgencyCategoryName } from './categories.js';
import type { AgentRef, FailurePolicy } from '../orchestration.js';

export interface BasePatternCategory {
  category: AgencyCategoryName;
  type: string;
  name?: string;
  description?: string;
  agents?: AgentRef[];
  failurePolicy?: FailurePolicy;
}

export interface PerceptionPatternCategory extends BasePatternCategory {
  category: 'perception';
  type: 'summarisation' | 'narrative' | 'observation';
}

export interface CommunicationPatternCategory extends BasePatternCategory {
  category: 'communication';
  type: 'channel-execution' | 'channel-summary';
}

export interface GovernancePatternCategory extends BasePatternCategory {
  category: 'governance';
  type: 'judgment' | 'oversight' | 'attestation' | 'trust';
}

export interface OptimisationPatternCategory extends BasePatternCategory {
  category: 'optimisation';
  type: 'prompt-optimisation';
}

export interface SocialPatternCategory extends BasePatternCategory {
  category: 'social';
  type: 'memory-hygiene' | 'cognition' | 'reflection';
}
