import { describe, it, expect } from 'vitest';
import { DIAGRAM_TAGS, DIAGRAM_TYPE_VARIANT, DEFAULT_BADGE_VARIANT } from './diagram-tags.js';

describe('DIAGRAM_TAGS', () => {
  it('maps all domain formats including aliases', () => {
    expect(DIAGRAM_TAGS).toEqual({
      case: 'casehub-diagram',
      choreography: 'casehub-diagram',
      goap: 'casehub-diagram',
      swf: 'swf-diagram',
      htn: 'htn-diagram',
      org: 'agency-org-diagram',
    });
  });

  it('does not include page format', () => {
    expect(DIAGRAM_TAGS).not.toHaveProperty('page');
  });
});

describe('DIAGRAM_TYPE_VARIANT', () => {
  it('maps diagram types to semantic variant categories', () => {
    expect(DIAGRAM_TYPE_VARIANT).toEqual({
      choreography: 'info',
      htn: 'accent',
      goap: 'warning',
      llm: 'success',
      swf: 'danger',
      playbook: 'success',
      'agent-conf': 'neutral',
      'avatar-conf': 'neutral',
      agency: 'neutral',
    });
  });

  it('DEFAULT_BADGE_VARIANT is neutral', () => {
    expect(DEFAULT_BADGE_VARIANT).toBe('neutral');
  });

  it('every variant value is a valid semantic category', () => {
    const validVariants = new Set(['info', 'accent', 'warning', 'success', 'danger', 'neutral']);
    for (const variant of Object.values(DIAGRAM_TYPE_VARIANT)) {
      expect(validVariants).toContain(variant);
    }
  });
});
