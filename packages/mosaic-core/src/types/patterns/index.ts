export type { PlaybookPatternCategory, PlaybookPatternType } from '@casehubio/yaml-core/patterns';

export * from './categories.js';
export * from './base.js';
export * from './orchestration.js';
export * from './deliberation.js';
export * from './normalize.js';

import type { PlaybookPatternCategory } from '@casehubio/yaml-core/patterns';
import type { OrchestrationPatternCategory } from './orchestration.js';
import type { DeliberationPatternCategory } from './deliberation.js';
import type {
  PerceptionPatternCategory,
  CommunicationPatternCategory,
  GovernancePatternCategory,
  OptimisationPatternCategory,
  SocialPatternCategory,
} from './base.js';

export type PatternCategory =
  | PlaybookPatternCategory
  | OrchestrationPatternCategory
  | DeliberationPatternCategory
  | PerceptionPatternCategory
  | CommunicationPatternCategory
  | GovernancePatternCategory
  | OptimisationPatternCategory
  | SocialPatternCategory;
