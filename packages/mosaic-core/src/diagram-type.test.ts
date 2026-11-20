import { describe, it, expect } from 'vitest';
import { detectDiagramType, detectDiagramTypeFromSrc } from './diagram-type.js';

const CASE_YAML = `dsl: "1.0.0"
namespace: test
name: my-case
spec:
  bindings:
    - name: b1
      capability: cap1
  workers:
    - name: w1
      capabilities: [cap1]
`;

const SWF_YAML = `document:
  dsl: "1.0.0"
  namespace: test
  name: my-flow
do:
  - step1:
      call: http:get
`;

const UNKNOWN_YAML = `foo: bar
baz: 42
`;

describe('detectDiagramType', () => {
  it('detects case definition as choreography', () => {
    expect(detectDiagramType(CASE_YAML)).toBe('choreography');
  });

  it('detects GOAP definition', () => {
    const GOAP_YAML = `dsl: "1.0.0"
namespace: test
name: my-case
spec:
  bindings:
    - name: b1
      capability: cap1
  workers:
    - name: w1
      capabilities: [cap1]
  goals:
    - name: resolve-case
      expression:
        all: [b1]
`;
    expect(detectDiagramType(GOAP_YAML)).toBe('goap');
  });

  it('detects SWF workflow', () => {
    expect(detectDiagramType(SWF_YAML)).toBe('swf');
  });

  it('returns unknown for unrecognised YAML', () => {
    expect(detectDiagramType(UNKNOWN_YAML)).toBe('unknown');
  });

  it('handles empty or invalid YAML', () => {
    expect(detectDiagramType('')).toBe('unknown');
    expect(detectDiagramType('not: valid: yaml: [')).toBe('unknown');
  });

  it('detects HTN decomposition', () => {
    const HTN_YAML = `dsl: "1.0.0"
namespace: test
name: my-case
spec:
  decomposition:
    root:
      name: investigate
      methods:
        - guard: ".severity == 'high'"
          tasks:
            - name: triage
              capability: triage-assessment
`;
    expect(detectDiagramType(HTN_YAML)).toBe('htn');
  });

  it('HTN takes priority over GOAP when both present', () => {
    const HTN_GOAP_YAML = `dsl: "1.0.0"
namespace: test
name: my-case
spec:
  decomposition:
    root:
      name: investigate
  goals:
    - name: resolve
      expression:
        all: [investigate]
`;
    expect(detectDiagramType(HTN_GOAP_YAML)).toBe('htn');
  });
});

describe('detectDiagramTypeFromSrc', () => {
  it('extracts type from name.type.yaml pattern', () => {
    expect(detectDiagramTypeFromSrc('mycase.choreography.yaml')).toBe('choreography');
    expect(detectDiagramTypeFromSrc('plan.htn.yaml')).toBe('htn');
    expect(detectDiagramTypeFromSrc('bot.agent-conf.yaml')).toBe('agent-conf');
    expect(detectDiagramTypeFromSrc('flow.swf.yml')).toBe('swf');
  });

  it('returns undefined for single-segment filenames', () => {
    expect(detectDiagramTypeFromSrc('legacy.yaml')).toBeUndefined();
    expect(detectDiagramTypeFromSrc('file.yml')).toBeUndefined();
  });

  it('returns undefined for empty or missing src', () => {
    expect(detectDiagramTypeFromSrc('')).toBeUndefined();
  });

  it('extracts from URL paths', () => {
    expect(detectDiagramTypeFromSrc('/api/definitions/mycase.choreography.yaml')).toBe('choreography');
    expect(detectDiagramTypeFromSrc('https://example.com/defs/plan.htn.yaml')).toBe('htn');
  });

  it('ignores query strings and fragments', () => {
    expect(detectDiagramTypeFromSrc('mycase.goap.yaml?v=2')).toBe('goap');
    expect(detectDiagramTypeFromSrc('mycase.llm.yaml#section')).toBe('llm');
  });
});
