import {
  MBTI_META, ENNEAGRAM_META, DISC_META, SDI_META,
  BIG_FIVE_DIMS, BIG_FIVE_LABELS, FRAMEWORK_LABELS,
} from '@casehubio/mosaic-core';
import type { PersonalityFramework, BigFiveDimension } from '@casehubio/mosaic-core';

export { BIG_FIVE_DIMS, BIG_FIVE_LABELS, FRAMEWORK_LABELS };
export type { PersonalityFramework, BigFiveDimension };

const ADJECTIVE_MAP: Record<string, string> = {};
for (const [v, m] of Object.entries(MBTI_META)) ADJECTIVE_MAP[v] = m.adjective;
for (const [v, m] of Object.entries(ENNEAGRAM_META)) if (m.adjective) ADJECTIVE_MAP[v] = m.adjective;
for (const [v, m] of Object.entries(DISC_META)) if (m.adjective) ADJECTIVE_MAP[v] = m.adjective;
for (const [v, m] of Object.entries(SDI_META)) if (m.adjective) ADJECTIVE_MAP[v] = m.adjective;

export const FRAMEWORK_DESCRIPTORS: Record<string, string> = ADJECTIVE_MAP;

export function buildSummaryText(
  mbti: string | undefined,
  enneagram: string | undefined,
  disc: string | undefined,
  roleLabel: string,
): string {
  const parts: string[] = [];
  if (mbti && ADJECTIVE_MAP[mbti]) parts.push(ADJECTIVE_MAP[mbti]);
  if (enneagram && ADJECTIVE_MAP[enneagram]) parts.push(ADJECTIVE_MAP[enneagram]);

  const discDesc = disc && ADJECTIVE_MAP[disc];

  if (parts.length === 0 && !discDesc) return '';

  const cleanLabel = roleLabel.replace(/^the\s+/i, '');
  const joined = parts.join(', ');
  const article = /^[aeiou]/i.test(joined) ? 'An' : 'A';
  let text = article + ' ' + joined + ' ' + cleanLabel.toLowerCase();
  if (discDesc) text += ` with ${discDesc} drive`;
  return text;
}
