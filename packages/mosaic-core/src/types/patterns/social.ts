import type { AgentRefSpec, FailurePolicySpec } from '../orchestration.js';

export type SocialPatternType = 'memory-hygiene' | 'cognition' | 'reflection';

export interface RetentionConfig {
  retentionThreshold?: number;
  confidenceWeight?: number;
  recencyWeight?: number;
  scopeWeight?: number;
  trustWeight?: number;
}

export interface CognitionConfig {
  drive?: Record<string, unknown>;
  mood?: Record<string, unknown>;
  personalityEvolution?: Record<string, unknown>;
  userModel?: Record<string, unknown>;
  strategyLearning?: Record<string, unknown>;
  mentalModel?: Record<string, unknown>;
  narrative?: Record<string, unknown>;
  goalProposal?: Record<string, unknown>;
  goalEscalation?: Record<string, unknown>;
  normDetection?: Record<string, unknown>;
  collectiveGoal?: Record<string, unknown>;
  retention?: RetentionConfig;
  cognitiveGoal?: Record<string, unknown>;
}

export interface SocialPatternCategory {
  category: 'social';
  type: SocialPatternType;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  failurePolicy?: FailurePolicySpec;
  cognition?: CognitionConfig;
  retention?: RetentionConfig;
}
