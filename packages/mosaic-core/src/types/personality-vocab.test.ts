import { describe, it, expect } from 'vitest';
import {
  MBTI_TYPES, ENNEAGRAM_TYPES, DISC_TYPES, BELBIN_TYPES, SDI_TYPES, BIGFIVE_TYPES,
  MBTI_META, ENNEAGRAM_META, DISC_META, BELBIN_META, SDI_META, BIGFIVE_META,
  DISPOSITION_AXES, BEHAVIORAL_TENDENCY_RULES, FRAMEWORK_DESCRIPTIONS,
  ARCHETYPE_COMPATIBILITY, ARCHETYPE_AFFINITIES, ARCHETYPE_TERMS,
  VOCAB_ALL_VALUES, FRAMEWORK_LABELS, BIG_FIVE_DIMS, BIG_FIVE_LABELS,
} from './personality-vocab.js';

describe('personality-vocab generated module', () => {
  it('has 16 MBTI types', () => {
    expect(MBTI_TYPES).toHaveLength(16);
  });

  it('has 9 Enneagram types', () => {
    expect(ENNEAGRAM_TYPES).toHaveLength(9);
  });

  it('has 4 DISC types', () => {
    expect(DISC_TYPES).toHaveLength(4);
  });

  it('has 9 Belbin types', () => {
    expect(BELBIN_TYPES).toHaveLength(9);
  });

  it('has 4 SDI types', () => {
    expect(SDI_TYPES).toHaveLength(4);
  });

  it('has 10 Big Five types', () => {
    expect(BIGFIVE_TYPES).toHaveLength(10);
  });

  it('uses kebab-case values', () => {
    expect(MBTI_TYPES).toContain('intj');
    expect(ENNEAGRAM_TYPES).toContain('type-1');
    expect(DISC_TYPES).toContain('dominance');
    expect(BELBIN_TYPES).toContain('plant');
    expect(SDI_TYPES).toContain('blue');
  });

  it('every MBTI term has metadata with signal weights', () => {
    for (const value of MBTI_TYPES) {
      const meta = MBTI_META[value];
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.detailedDescription.length).toBeGreaterThan(100);
      expect(meta.adjective).toBeTruthy();
      expect(Object.keys(meta.signalWeights).length).toBeGreaterThan(0);
    }
  });

  it('every framework term has signal weights', () => {
    const allMetas = [
      ...Object.values(ENNEAGRAM_META),
      ...Object.values(DISC_META),
      ...Object.values(BELBIN_META),
      ...Object.values(SDI_META),
      ...Object.values(BIGFIVE_META),
    ];
    for (const meta of allMetas) {
      expect(Object.keys(meta.signalWeights).length).toBeGreaterThan(0);
    }
  });

  it('has 5 disposition axes', () => {
    expect(DISPOSITION_AXES).toHaveLength(5);
    for (const axis of DISPOSITION_AXES) {
      expect(axis.key).toBeTruthy();
      expect(axis.lowPoleDescription).toBeTruthy();
      expect(axis.highPoleDescription).toBeTruthy();
    }
  });

  it('has 22 behavioral tendency rules', () => {
    expect(BEHAVIORAL_TENDENCY_RULES).toHaveLength(22);
    for (const rule of BEHAVIORAL_TENDENCY_RULES) {
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
    }
  });

  it('has framework descriptions for all 6 frameworks', () => {
    for (const key of ['mbti', 'enneagram', 'disc', 'belbin', 'sdi', 'bigFive']) {
      expect(FRAMEWORK_DESCRIPTIONS[key]).toBeDefined();
      expect(FRAMEWORK_DESCRIPTIONS[key].description).toBeTruthy();
    }
  });

  it('archetypeCompatibility has title-case family names', () => {
    const mbtiIntj = ARCHETYPE_COMPATIBILITY['mbti']?.['intj'];
    expect(mbtiIntj).toBeDefined();
    for (const family of mbtiIntj!) {
      expect(family[0]).toMatch(/[A-Z]/);
    }
  });

  it('archetypeAffinities uses kebab-case values', () => {
    const angel = ARCHETYPE_AFFINITIES['angel'];
    expect(angel).toBeDefined();
    for (const v of angel.mbti) {
      expect(v).toMatch(/^[a-z]/);
    }
  });

  it('ARCHETYPE_TERMS has 48 entries with title-case families', () => {
    expect(ARCHETYPE_TERMS).toHaveLength(48);
    for (const term of ARCHETYPE_TERMS) {
      expect(term.family[0]).toMatch(/[A-Z]/);
      expect(term.value).toMatch(/^[a-z]/);
    }
  });

  it('VOCAB_ALL_VALUES has entries for all frameworks', () => {
    expect(VOCAB_ALL_VALUES.mbti).toEqual(MBTI_TYPES);
    expect(VOCAB_ALL_VALUES.enneagram).toEqual(ENNEAGRAM_TYPES);
    expect(VOCAB_ALL_VALUES.disc).toEqual(DISC_TYPES);
    expect(VOCAB_ALL_VALUES.belbin).toEqual(BELBIN_TYPES);
    expect(VOCAB_ALL_VALUES.sdi).toEqual(SDI_TYPES);
    expect(VOCAB_ALL_VALUES.bigFive).toEqual(BIGFIVE_TYPES);
  });

  it('FRAMEWORK_LABELS has all 5 frameworks', () => {
    expect(Object.keys(FRAMEWORK_LABELS)).toHaveLength(5);
  });

  it('BIG_FIVE_DIMS has 5 dimensions', () => {
    expect(BIG_FIVE_DIMS).toHaveLength(5);
    expect(BIG_FIVE_DIMS).toEqual(['O', 'C', 'E', 'A', 'N']);
  });
});

describe('personality-vocab staleness', () => {
  it('generated file is not stale', async () => {
    const { readFileSync } = await import('fs');
    const { execSync } = await import('child_process');
    const { resolve } = await import('path');
    const generatedPath = resolve(__dirname, 'personality-vocab.ts');
    const current = readFileSync(generatedPath, 'utf-8');
    execSync('yarn workspace @casehubio/mosaic-core run generate:vocab', { stdio: 'pipe' });
    const regenerated = readFileSync(generatedPath, 'utf-8');
    expect(regenerated).toBe(current);
  }, 30_000);
});
