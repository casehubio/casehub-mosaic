import {
  MBTI_META, ENNEAGRAM_META, DISC_META, BELBIN_META, SDI_META, BIGFIVE_META,
  FRAMEWORK_DESCRIPTIONS,
} from '@casehubio/mosaic-core';
import type { VocabTermMeta } from '@casehubio/mosaic-core';

export interface TooltipEntry {
  tip: string;
  detail: string;
}

function buildTooltips(): Record<string, TooltipEntry> {
  const result: Record<string, TooltipEntry> = {};

  const displayNames: Record<string, string> = {
    mbti: 'MBTI', enneagram: 'Enneagram', disc: 'DISC',
    belbin: 'Belbin', sdi: 'SDI', bigFive: 'Big Five',
  };
  for (const [key, desc] of Object.entries(FRAMEWORK_DESCRIPTIONS)) {
    result[displayNames[key] ?? key] = { tip: desc.description, detail: desc.detailedDescription };
  }

  function addTerms(prefix: string, meta: Record<string, VocabTermMeta>) {
    for (const [value, m] of Object.entries(meta)) {
      result[`${prefix}:${value}`] = { tip: m.description, detail: m.detailedDescription };
    }
  }

  addTerms('MBTI', MBTI_META);
  addTerms('Enneagram', ENNEAGRAM_META);
  addTerms('DISC', DISC_META);
  addTerms('Belbin', BELBIN_META);
  addTerms('SDI', SDI_META);
  addTerms('Big Five', BIGFIVE_META);

  return result;
}

export const FRAMEWORK_TOOLTIPS: Record<string, TooltipEntry> = buildTooltips();
