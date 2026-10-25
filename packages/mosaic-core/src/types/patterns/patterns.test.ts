import { describe, it, expect } from 'vitest';
import type {
  AgencyCategoryName,
  PatternCategoryName,
  PatternCategory,
  OrchestrationPatternCategory,
  DeliberationPatternCategory,
  PerceptionPatternCategory,
} from './index.js';
import type {
  RoutingSpec, AggregationSpec, TerminationSpec, DecompositionSpec,
} from '../orchestration.js';
import { normalizePatternType } from './normalize.js';

describe('pattern category hierarchy', () => {
  it('AgencyCategoryName covers all 7 categories', () => {
    const names: AgencyCategoryName[] = [
      'orchestration', 'deliberation', 'perception',
      'communication', 'governance', 'optimisation', 'social',
    ];
    expect(names).toHaveLength(7);
  });

  it('PatternCategoryName includes playbook', () => {
    const names: PatternCategoryName[] = [
      'playbook', 'orchestration', 'deliberation', 'perception',
      'communication', 'governance', 'optimisation', 'social',
    ];
    expect(names).toHaveLength(8);
  });

  it('OrchestrationPatternCategory discriminates on category + type', () => {
    const p: OrchestrationPatternCategory = {
      category: 'orchestration',
      type: 'supervisor',
      name: 'risk-supervisor',
    };
    expect(p.category).toBe('orchestration');
    expect(p.type).toBe('supervisor');
  });

  it('DeliberationPatternCategory has judgment fields', () => {
    const p: DeliberationPatternCategory = {
      category: 'deliberation',
      type: 'voting',
      name: 'risk-vote',
      maxRounds: 3,
      judgment: {
        trigger: { type: 'confidenceThreshold', threshold: 0.8 },
        caller: { type: 'fanOut' },
      },
    };
    expect(p.maxRounds).toBe(3);
    expect(p.judgment!.trigger!.type).toBe('confidenceThreshold');
  });

  it('PatternCategory union narrows on category field', () => {
    const p: PatternCategory = {
      category: 'deliberation',
      type: 'debate',
      name: 'policy-debate',
      maxRounds: 5,
    };
    if (p.category === 'deliberation') {
      expect(p.maxRounds).toBe(5);
    }
  });

  it('minimal categories accept base fields only', () => {
    const p: PerceptionPatternCategory = {
      category: 'perception',
      type: 'summarisation',
      name: 'doc-summary',
    };
    expect(p.category).toBe('perception');
  });
});

describe('sub-spec discriminated unions', () => {
  it('RoutingSpec discriminates on type field', () => {
    const r: RoutingSpec = { type: 'first-match' };
    expect(r.type).toBe('first-match');
  });

  it('AggregationSpec discriminates on type field', () => {
    const a: AggregationSpec = { type: 'collect-all' };
    expect(a.type).toBe('collect-all');
  });

  it('TerminationSpec discriminates on type field', () => {
    const t: TerminationSpec = { type: 'goal-reached' };
    expect(t.type).toBe('goal-reached');
  });

  it('DecompositionSpec discriminates on type field', () => {
    const d: DecompositionSpec = { type: 'llm' };
    expect(d.type).toBe('llm');
  });

  it('OrchestrationPatternCategory uses typed routing and decomposition', () => {
    const p: OrchestrationPatternCategory = {
      category: 'orchestration',
      type: 'supervisor',
      name: 'risk-supervisor',
      routing: { type: 'first-match' },
      decomposition: { type: 'static' },
      aggregation: { type: 'collect-all' },
      termination: [{ type: 'max-iterations' }],
    };
    expect(p.routing!.type).toBe('first-match');
  });
});

describe('normalizePatternType', () => {
  it('converts UPPERCASE to lowercase', () => {
    expect(normalizePatternType('SUPERVISOR')).toBe('supervisor');
    expect(normalizePatternType('VOTING')).toBe('voting');
  });

  it('passes through lowercase unchanged', () => {
    expect(normalizePatternType('debate')).toBe('debate');
  });
});
