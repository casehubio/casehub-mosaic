import { parse as parseYaml } from 'yaml';

export function detectDiagramTypeFromSrc(src: string): string | undefined {
  if (!src) return undefined;
  const filename = src.split('/').pop()!.split('?')[0]!.split('#')[0]!;
  const segments = filename.split('.');
  if (segments.length < 3) return undefined;
  const ext = segments[segments.length - 1];
  if (ext !== 'yaml' && ext !== 'yml') return undefined;
  return segments[segments.length - 2];
}

export function detectDiagramType(yaml: string): string {
  try {
    const parsed = parseYaml(yaml) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return 'unknown';

    const spec = parsed['spec'] as Record<string, unknown> | undefined;
    if (spec?.['decomposition']) return 'htn';
    if (spec?.['goals']) return 'goap';
    if (spec && (spec['bindings'] || spec['workers'])) return 'choreography';

    if (parsed['document'] && parsed['do']) return 'swf';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}
