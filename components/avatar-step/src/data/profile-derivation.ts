import type { ArchetypeFamily } from '@casehubio/mosaic-agent-avatar-2d';
import { SUB_ARCHETYPE_RULES, FRAMEWORK_FAMILY_MAP } from './compatibility-matrix.js';
import type { BigFiveDimension, BigFivePole } from '@casehubio/mosaic-core';
import { BIG_FIVE_DIMS } from '@casehubio/mosaic-core';
import type { PersonalityProfile } from '@casehubio/mosaic-core';

const DIM_NAMES: Record<BigFiveDimension, string> = {
  O: 'openness', C: 'conscientiousness', E: 'extraversion', A: 'agreeableness', N: 'neuroticism',
};

export function initProfile(archetypeKey: string): PersonalityProfile {
  const [family, sub] = archetypeKey.split('/');
  const profile: PersonalityProfile = {};
  const lowerSub = sub?.toLowerCase();

  const rules = SUB_ARCHETYPE_RULES[family as ArchetypeFamily]?.find(
    r => r.subArchetype.toLowerCase() === lowerSub,
  );
  if (rules?.mbtiAffinity.length) profile.mbti = rules.mbtiAffinity[0]! as any;
  if (rules?.enneagramAffinity.length) profile.enneagram = `type-${rules.enneagramAffinity[0]}` as any;

  for (const fw of ['disc', 'sdi'] as const) {
    const map = FRAMEWORK_FAMILY_MAP[fw];
    for (const [val, families] of Object.entries(map)) {
      if ((families as string[]).includes(family!)) { (profile as any)[fw] = val; break; }
    }
  }

  const belbinMatches: string[] = [];
  for (const [val, families] of Object.entries(FRAMEWORK_FAMILY_MAP.belbin)) {
    if ((families as string[]).includes(family!)) belbinMatches.push(val);
  }
  if (belbinMatches.length > 0) {
    profile.belbin = { primary: belbinMatches[0]! as any, secondaries: belbinMatches.slice(1, 3) as any };
  }

  const bigFive: Partial<Record<BigFiveDimension, BigFivePole>> = {};
  for (const dim of BIG_FIVE_DIMS) {
    const highKey = `${DIM_NAMES[dim]}-high`;
    const lowKey = `${DIM_NAMES[dim]}-low`;
    const highFamilies = FRAMEWORK_FAMILY_MAP.bigFive[highKey] as string[] | undefined;
    const lowFamilies = FRAMEWORK_FAMILY_MAP.bigFive[lowKey] as string[] | undefined;
    const inHigh = highFamilies?.includes(family!) ?? false;
    const inLow = lowFamilies?.includes(family!) ?? false;
    if (inHigh && !inLow) bigFive[dim] = 'high';
    else if (inLow && !inHigh) bigFive[dim] = 'low';
  }
  if (Object.keys(bigFive).length > 0) profile.bigFive = bigFive;

  return profile;
}
