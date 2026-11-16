import type { PersonalityProfile } from '@casehubio/mosaic-core';
import {
  MBTI_META, ENNEAGRAM_META, DISC_META, SDI_META, BELBIN_META, BIGFIVE_META,
  DISPOSITION_AXES, BEHAVIORAL_TENDENCY_RULES,
} from '@casehubio/mosaic-core';
import type { DispositionAxisKey, BigFiveDimension, BigFivePole } from '@casehubio/mosaic-core';

export type CanonicalAxis = DispositionAxisKey;

export interface AxisScore {
  axis: DispositionAxisKey;
  label: string;
  lowLabel: string;
  highLabel: string;
  score: number;
  contributors: string[];
}

type Signal = [DispositionAxisKey, number];

function termsSignals(meta: Record<string, { signalWeights: Partial<Record<DispositionAxisKey, number>> }>, value: string): Signal[] {
  const entry = meta[value];
  if (!entry) return [];
  return Object.entries(entry.signalWeights)
    .filter(([, v]) => v !== 0)
    .map(([axis, weight]) => [axis as DispositionAxisKey, weight!]);
}

const DIM_TO_VALUES: Record<BigFiveDimension, { high: string; low: string }> = {
  O: { high: 'openness-high', low: 'openness-low' },
  C: { high: 'conscientiousness-high', low: 'conscientiousness-low' },
  E: { high: 'extraversion-high', low: 'extraversion-low' },
  A: { high: 'agreeableness-high', low: 'agreeableness-low' },
  N: { high: 'neuroticism-high', low: 'neuroticism-low' },
};

function bigFiveSignals(bigFive: Partial<Record<BigFiveDimension, BigFivePole>>): Signal[] {
  const signals: Signal[] = [];
  for (const [dim, pole] of Object.entries(bigFive) as [BigFiveDimension, BigFivePole][]) {
    const value = DIM_TO_VALUES[dim]?.[pole];
    if (value) signals.push(...termsSignals(BIGFIVE_META, value));
  }
  return signals;
}

export function deriveDispositions(profile: PersonalityProfile): AxisScore[] {
  const axes = DISPOSITION_AXES;
  const totals: Record<DispositionAxisKey, { sum: number; count: number; contributors: string[] }> = {} as any;
  for (const a of axes) totals[a.key as DispositionAxisKey] = { sum: 0, count: 0, contributors: [] };

  function add(signals: Signal[], source: string) {
    for (const [axis, value] of signals) {
      totals[axis].sum += value;
      totals[axis].count++;
      totals[axis].contributors.push(source);
    }
  }

  if (profile.mbti) add(termsSignals(MBTI_META, profile.mbti), `MBTI ${MBTI_META[profile.mbti]?.label ?? profile.mbti}`);
  if (profile.enneagram) add(termsSignals(ENNEAGRAM_META, profile.enneagram), ENNEAGRAM_META[profile.enneagram]?.label ?? profile.enneagram);
  if (profile.disc) add(termsSignals(DISC_META, profile.disc), `DISC ${DISC_META[profile.disc]?.label ?? profile.disc}`);
  if (profile.sdi) add(termsSignals(SDI_META, profile.sdi), `SDI ${SDI_META[profile.sdi]?.label ?? profile.sdi}`);
  if (profile.belbin?.primary) add(termsSignals(BELBIN_META, profile.belbin.primary), `Belbin ${BELBIN_META[profile.belbin.primary]?.label ?? profile.belbin.primary}`);
  if (profile.bigFive) add(bigFiveSignals(profile.bigFive), 'Big Five');

  return axes.map(a => {
    const t = totals[a.key as DispositionAxisKey];
    const score = t.count > 0 ? Math.max(-1, Math.min(1, t.sum / t.count)) : 0;
    return { axis: a.key as DispositionAxisKey, label: a.displayName, lowLabel: a.lowPole, highLabel: a.highPole, score, contributors: t.contributors };
  });
}

export interface BehavioralTendency {
  name: string;
  description: string;
  strength: 'strong' | 'moderate' | 'mild';
  inferredFrom: string[];
}

export const DISPOSITION_TIPS: Record<string, { low: string; high: string }> = Object.fromEntries(
  DISPOSITION_AXES.map(a => [a.key, { low: a.lowPoleDescription, high: a.highPoleDescription }]),
);

export function deriveTendencies(scores: AxisScore[]): BehavioralTendency[] {
  const scoreMap = Object.fromEntries(scores.map(s => [s.axis, s.score])) as Record<DispositionAxisKey, number>;
  const result: BehavioralTendency[] = [];

  for (const rule of BEHAVIORAL_TENDENCY_RULES) {
    let totalExcess = 0;
    let allMet = true;
    const sources: string[] = [];
    for (const cond of rule.conditions) {
      const val = scoreMap[cond.axis] ?? 0;
      const effective = cond.direction === 'high' ? val : -val;
      if (effective < cond.threshold) { allMet = false; break; }
      totalExcess += effective - cond.threshold;
      const axisScore = scores.find(s => s.axis === cond.axis);
      const label = cond.direction === 'high' ? axisScore?.highLabel : axisScore?.lowLabel;
      sources.push(`${label ?? cond.axis} (${(val * 100).toFixed(0)}%)`);
    }
    if (!allMet) continue;
    const avgExcess = totalExcess / rule.conditions.length;
    const strength: 'strong' | 'moderate' | 'mild' = avgExcess > 0.3 ? 'strong' : avgExcess > 0.15 ? 'moderate' : 'mild';
    result.push({ name: rule.name, description: rule.description, strength, inferredFrom: sources });
  }

  result.sort((a, b) => {
    const order = { strong: 0, moderate: 1, mild: 2 };
    return order[a.strength] - order[b.strength];
  });
  return result;
}
