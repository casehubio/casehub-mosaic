import { describe, it, expect } from 'vitest';
import { initProfile } from './profile-derivation.js';

describe('initProfile', () => {
  it('derives full personality profile for Caregiver/Angel', () => {
    const profile = initProfile('Caregiver/Angel');
    expect(profile.mbti).toBe('infj');
    expect(profile.enneagram).toBe('type-2');
    expect(profile.disc).toBe('steadiness');
    expect(profile.sdi).toBe('blue');
    expect(profile.belbin?.primary).toBe('co-ordinator');
    expect(profile.belbin?.secondaries).toContain('teamworker');
    expect(profile.bigFive?.O).toBe('low');
    expect(profile.bigFive?.A).toBe('high');
  });

  it('derives profile for Hero/Warrior', () => {
    const profile = initProfile('Hero/Warrior');
    expect(profile.mbti).toBe('entj');
    expect(profile.enneagram).toBe('type-8');
    expect(profile.disc).toBe('dominance');
    expect(profile.sdi).toBe('red');
  });

  it('returns empty profile for unknown archetype', () => {
    const profile = initProfile('Unknown/None');
    expect(profile.mbti).toBeUndefined();
    expect(profile.sdi).toBeUndefined();
  });
});
