import type { ArchetypeFamily } from '@casehubio/mosaic-agent-avatar-2d';
import { PROFESSION_PRESETS } from './profession-presets.js';
import {
  ARCHETYPE_COMPATIBILITY, ARCHETYPE_AFFINITIES, ARCHETYPE_TERMS, VOCAB_ALL_VALUES,
} from '@casehubio/mosaic-core';
import type { PersonalityFramework, BigFiveDimension, BigFivePole } from '@casehubio/mosaic-core';

export type { PersonalityFramework, BigFiveDimension, BigFivePole };

export const FRAMEWORK_FAMILY_MAP: Record<
  PersonalityFramework | 'bigFive',
  Record<string, ArchetypeFamily[]>
> = {
  mbti: ARCHETYPE_COMPATIBILITY['mbti'] as Record<string, ArchetypeFamily[]>,
  enneagram: ARCHETYPE_COMPATIBILITY['enneagram'] as Record<string, ArchetypeFamily[]>,
  disc: ARCHETYPE_COMPATIBILITY['disc'] as Record<string, ArchetypeFamily[]>,
  belbin: {
    'plant': ['Creator', 'Magician'],
    'resource-investigator': ['Explorer', 'Jester', 'Everyman'],
    'co-ordinator': ['Sovereign', 'Caregiver'],
    'shaper': ['Hero', 'Rebel', 'Sovereign'],
    'monitor-evaluator': ['Sage', 'Sovereign'],
    'teamworker': ['Everyman', 'Caregiver', 'Lover'],
    'implementer': ['Everyman', 'Sovereign'],
    'completer-finisher': ['Sage', 'Sovereign'],
    'specialist': ['Sage', 'Explorer'],
  },
  bigFive: {
    'openness-high': ['Creator', 'Explorer', 'Jester', 'Lover', 'Magician', 'Rebel', 'Sage'],
    'openness-low': ['Caregiver', 'Everyman', 'Hero', 'Innocent', 'Sovereign'],
    'conscientiousness-high': ['Caregiver', 'Everyman', 'Hero', 'Innocent', 'Magician', 'Sage', 'Sovereign'],
    'conscientiousness-low': ['Creator', 'Explorer', 'Jester', 'Lover', 'Rebel'],
    'extraversion-high': ['Caregiver', 'Everyman', 'Explorer', 'Hero', 'Jester', 'Lover', 'Rebel', 'Sovereign'],
    'extraversion-low': ['Creator', 'Innocent', 'Magician', 'Sage'],
    'agreeableness-high': ['Caregiver', 'Everyman', 'Innocent', 'Jester', 'Lover', 'Sage'],
    'agreeableness-low': ['Creator', 'Explorer', 'Hero', 'Magician', 'Rebel', 'Sovereign'],
    'neuroticism-high': ['Creator', 'Lover', 'Rebel'],
    'neuroticism-low': ['Caregiver', 'Everyman', 'Explorer', 'Hero', 'Innocent', 'Jester', 'Magician', 'Sage', 'Sovereign'],
  },
  sdi: {
    'blue': ['Caregiver', 'Innocent', 'Lover'],
    'red': ['Hero', 'Sovereign', 'Rebel'],
    'green': ['Sage', 'Explorer', 'Creator'],
    'hub': ['Everyman', 'Magician', 'Jester'],
  },
};

export interface SubArchetypeRule {
  readonly subArchetype: string;
  readonly mbtiAffinity: readonly string[];
  readonly enneagramAffinity: readonly number[];
}

function buildSubArchetypeRules(): Record<ArchetypeFamily, readonly SubArchetypeRule[]> {
  const byFamily = new Map<string, SubArchetypeRule[]>();

  for (const term of ARCHETYPE_TERMS) {
    const family = term.family;
    const aff = ARCHETYPE_AFFINITIES[term.value];
    if (!aff) continue;

    const ennNums = aff.enneagram.map(v => parseInt(v.replace('type-', ''), 10));

    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family)!.push({
      subArchetype: term.label,
      mbtiAffinity: aff.mbti,
      enneagramAffinity: ennNums,
    });
  }

  return Object.fromEntries(byFamily) as Record<ArchetypeFamily, readonly SubArchetypeRule[]>;
}

export const SUB_ARCHETYPE_RULES: Record<ArchetypeFamily, readonly SubArchetypeRule[]> = buildSubArchetypeRules();

export const ALL_FRAMEWORK_VALUES: Record<PersonalityFramework | 'bigFive', readonly string[]> = VOCAB_ALL_VALUES;

export function getFrameworkProfile(archetypeKey: string): Record<string, string[]> {
  const [family, sub] = archetypeKey.split('/');
  const profile: Record<string, string[]> = {};
  const lowerSub = sub?.toLowerCase();
  const rules = SUB_ARCHETYPE_RULES[family as ArchetypeFamily]?.find(
    r => r.subArchetype.toLowerCase() === lowerSub,
  );
  if (rules) {
    profile['MBTI'] = [...rules.mbtiAffinity];
    profile['Enneagram'] = rules.enneagramAffinity.map(n => `type-${n}`);
  }
  for (const [fw, map] of Object.entries(FRAMEWORK_FAMILY_MAP)) {
    if (fw === 'mbti' || fw === 'enneagram') continue;
    const label = fw === 'disc' ? 'DISC' : fw === 'belbin' ? 'Belbin' : fw === 'sdi' ? 'SDI' : 'Big Five';
    const matches = Object.entries(map).filter(([, families]) => (families as string[]).includes(family!)).map(([val]) => val);
    if (matches.length > 0) profile[label] = matches;
  }
  return profile;
}

export function getRolesForArchetype(archetypeKey: string): Array<{ profession: string; role: string }> {
  const matches: Array<{ profession: string; role: string }> = [];
  for (const [profession, roles] of Object.entries(PROFESSION_PRESETS)) {
    for (const { role, variants } of roles) {
      if (variants.some(v => v.archetype === archetypeKey)) {
        matches.push({ profession, role });
      }
    }
  }
  return matches;
}

export function getRoleFrameworkValues(profession: string, role: string): Set<string> {
  const roles = PROFESSION_PRESETS[profession];
  const r = roles?.find(x => x.role === role);
  if (!r) return new Set();
  const vals = new Set<string>();
  for (const v of r.variants) {
    const profile = getFrameworkProfile(v.archetype);
    for (const [fw, fvs] of Object.entries(profile)) {
      for (const fv of fvs) vals.add(`${fw}:${fv}`);
    }
  }
  return vals;
}
