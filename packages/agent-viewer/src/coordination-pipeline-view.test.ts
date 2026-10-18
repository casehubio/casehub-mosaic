import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CoordinationPipeline } from './coordination-types.js';
import './coordination-pipeline-view.js';
import type { CoordinationPipelineView } from './coordination-pipeline-view.js';

function kycPipeline(): CoordinationPipeline {
  return {
    name: 'kyc-verification',
    description: 'KYC verification pipeline',
    agentCount: 4,
    barrierCount: 2,
    channelCount: 1,
    phases: [
      {
        type: 'step',
        step: {
          action: 'agent-delegate',
          target: 'doc-classifier',
          model: 'claude-sonnet-5',
          outputFormat: 'structured',
          params: {
            'descriptor': 'document-classifier',
            'params.documents': '${params.applicationDocs}',
            'params.taxonomy': 'kyc-v3',
          },
        },
      },
      {
        type: 'signal',
        barrier: { type: 'signal', name: 'docs-classified', description: 'fan-out to extractors' },
      },
      {
        type: 'parallel',
        lanes: {
          'identity-extractor': [
            {
              action: 'agent-delegate',
              model: 'claude-opus-5',
              outputFormat: 'structured',
              drillDown: true,
              params: { descriptor: 'kyc-identity', docs: '${from.identity_docs}' },
            },
            { action: 'graphql', target: 'sanctions / screenEntity' },
          ],
          'financial-extractor': [
            {
              action: 'agent-delegate',
              model: 'claude-opus-5',
              outputFormat: 'structured',
              drillDown: true,
              params: { descriptor: 'kyc-financials', docs: '${from.financial_docs}' },
            },
            { action: 'rest', target: 'POST /api/aml/check' },
          ],
          'address-verifier': [
            {
              action: 'agent-delegate',
              model: 'claude-sonnet-5',
              outputFormat: 'structured',
              drillDown: true,
              params: { descriptor: 'kyc-address', docs: '${from.address_docs}' },
            },
            { action: 'mcp-call', target: 'geo-verify' },
          ],
        },
      },
      {
        type: 'quorum',
        barrier: { type: 'quorum', name: 'extraction-complete', required: 2, of: 3 },
      },
      {
        type: 'step',
        step: {
          action: 'agent-delegate',
          target: 'risk-assessor',
          model: 'claude-opus-5',
          outputFormat: 'structured',
          drillDown: true,
          params: {
            'descriptor': 'kyc-risk-decision',
            'params.identity': '${identity-extractor.result}',
            'params.financials': '${financial-extractor.result}',
            'params.address': '${address-verifier.result}',
            'params.riskPolicy': '${params.riskTier}',
          },
        },
        routing: {
          type: 'match',
          expression: '${ risk-assessor.result.decision }',
          cases: [
            {
              pattern: 'approve',
              step: {
                action: 'rest',
                target: 'POST /api/kyc/approve',
                channel: 'notify-compliance',
                icon: '✓',
                iconColor: 'green',
              },
            },
            {
              pattern: 'escalate',
              step: {
                action: 'agent-delegate',
                target: 'senior-reviewer',
                model: 'claude-opus-5',
                icon: '⚠',
                iconColor: 'amber',
              },
            },
            {
              pattern: 'reject',
              step: {
                action: 'rest',
                target: 'POST /api/kyc/reject',
                channel: 'notify-applicant',
                icon: '✕',
                iconColor: 'red',
              },
            },
          ],
        },
      },
    ],
  };
}

describe('coordination-pipeline-view', () => {
  let el: CoordinationPipelineView;

  beforeEach(async () => {
    el = document.createElement('coordination-pipeline-view') as CoordinationPipelineView;
    el.pipeline = kycPipeline();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders pipeline header with name', () => {
    const title = el.shadowRoot!.querySelector('.pipeline-header .title');
    expect(title?.textContent).toBe('kyc-verification');
  });

  it('renders pipeline meta counts', () => {
    const meta = el.shadowRoot!.querySelector('.pipeline-header .meta');
    expect(meta?.textContent).toContain('4 agents');
    expect(meta?.textContent).toContain('2 barriers');
    expect(meta?.textContent).toContain('1 channel');
  });

  it('renders first agent-delegate step card', () => {
    const cards = el.shadowRoot!.querySelectorAll('.step-card');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0]!;
    expect(firstCard.querySelector('.step-action')?.textContent).toBe('agent-delegate');
    expect(firstCard.querySelector('.step-target')?.textContent).toBe('doc-classifier');
  });

  it('renders model badge on step card', () => {
    const badge = el.shadowRoot!.querySelector('.badge-model');
    expect(badge?.textContent).toBe('claude-sonnet-5');
  });

  it('renders output format badge', () => {
    const badge = el.shadowRoot!.querySelector('.badge-format');
    expect(badge?.textContent).toBe('structured');
  });

  it('renders params with expression pills', () => {
    const body = el.shadowRoot!.querySelector('.invoke-body');
    expect(body).not.toBeNull();
    const fromExpr = body!.querySelector('.expr.param');
    expect(fromExpr?.textContent).toBe('${params.applicationDocs}');
  });

  it('renders literal values in quotes', () => {
    const body = el.shadowRoot!.querySelector('.invoke-body');
    const literals = body!.querySelectorAll('.value');
    const texts = Array.from(literals).map(l => l.textContent);
    expect(texts).toContain('"document-classifier"');
    expect(texts).toContain('"kyc-v3"');
  });

  it('renders signal barrier', () => {
    const barriers = el.shadowRoot!.querySelectorAll('.barrier-bar');
    const signalBarrier = Array.from(barriers).find(b => b.classList.contains('signal'));
    expect(signalBarrier).not.toBeNull();
    expect(signalBarrier!.querySelector('.barrier-label')?.textContent).toBe('◇ signal');
    expect(signalBarrier!.querySelector('.barrier-name')?.textContent).toBe('docs-classified');
    expect(signalBarrier!.querySelector('.barrier-detail')?.textContent).toBe('fan-out to extractors');
  });

  it('renders quorum barrier with counts', () => {
    const barriers = el.shadowRoot!.querySelectorAll('.barrier-bar');
    const quorum = Array.from(barriers).find(b => b.classList.contains('quorum'));
    expect(quorum).not.toBeNull();
    expect(quorum!.querySelector('.barrier-label')?.textContent).toBe('▮ quorum');
    expect(quorum!.querySelector('.barrier-name')?.textContent).toBe('extraction-complete');
    expect(quorum!.querySelector('.barrier-detail')?.textContent).toBe('required: 2 of 3');
  });

  it('renders 3 swim lanes', () => {
    const lanes = el.shadowRoot!.querySelectorAll('.swim-lane');
    expect(lanes.length).toBe(3);
  });

  it('renders lane names', () => {
    const laneNames = el.shadowRoot!.querySelectorAll('.lane-name');
    expect(laneNames[0]?.textContent).toBe('identity-extractor');
    expect(laneNames[1]?.textContent).toBe('financial-extractor');
    expect(laneNames[2]?.textContent).toBe('address-verifier');
  });

  it('renders grid columns matching lane count', () => {
    const grid = el.shadowRoot!.querySelector('.swim-lanes') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('1fr 1fr 1fr');
  });

  it('renders drillable step cards with border', () => {
    const drillables = el.shadowRoot!.querySelectorAll('.step-card.drillable');
    expect(drillables.length).toBeGreaterThanOrEqual(3);
  });

  it('renders drill-down hint on drillable cards', () => {
    const hints = el.shadowRoot!.querySelectorAll('.drill-hint');
    expect(hints.length).toBeGreaterThanOrEqual(3);
    expect(hints[0]?.textContent).toBe('↗ drill down');
  });

  it('renders match/case routing', () => {
    const keyword = el.shadowRoot!.querySelector('.keyword');
    expect(keyword?.textContent).toBe('match');
    const condition = el.shadowRoot!.querySelector('.condition');
    expect(condition?.textContent).toBe('${ risk-assessor.result.decision }');
  });

  it('renders 3 match cases', () => {
    const cases = el.shadowRoot!.querySelectorAll('.match-case');
    expect(cases.length).toBe(3);
  });

  it('renders match case patterns', () => {
    const patterns = el.shadowRoot!.querySelectorAll('.match-pattern');
    expect(patterns[0]?.textContent).toBe('"approve"');
    expect(patterns[1]?.textContent).toBe('"escalate"');
    expect(patterns[2]?.textContent).toBe('"reject"');
  });

  it('renders channel badges on match case steps', () => {
    const channels = el.shadowRoot!.querySelectorAll('.badge-channel');
    expect(channels.length).toBe(2);
    expect(channels[0]?.textContent).toBe('→ notify-compliance');
  });

  it('renders custom icons on match case steps', () => {
    const cases = el.shadowRoot!.querySelectorAll('.match-case .step-icon');
    expect(cases[0]?.textContent).toBe('✓');
    expect(cases[0]?.classList.contains('approve')).toBe(true);
    expect(cases[1]?.textContent).toBe('⚠');
    expect(cases[2]?.textContent).toBe('✕');
    expect(cases[2]?.classList.contains('reject')).toBe(true);
  });

  it('renders expression type "from" for agent result references', () => {
    const fromExprs = el.shadowRoot!.querySelectorAll('.expr.from');
    expect(fromExprs.length).toBeGreaterThan(0);
  });

  it('renders nothing when pipeline is undefined', async () => {
    el.pipeline = undefined as unknown as CoordinationPipeline;
    await el.updateComplete;
    expect(el.shadowRoot!.children.length).toBe(1); // style only
  });

  it('omits meta span when no counts provided', async () => {
    el.pipeline = {
      name: 'minimal',
      phases: [],
    };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.pipeline-header .meta')).toBeNull();
  });

  it('renders each lane with correct step types', () => {
    const lanes = el.shadowRoot!.querySelectorAll('.swim-lane');
    const firstLaneActions = lanes[0]!.querySelectorAll('.step-action');
    expect(firstLaneActions[0]?.textContent).toBe('agent-delegate');
    expect(firstLaneActions[1]?.textContent).toBe('graphql');

    const secondLaneActions = lanes[1]!.querySelectorAll('.step-action');
    expect(secondLaneActions[1]?.textContent).toBe('rest');

    const thirdLaneActions = lanes[2]!.querySelectorAll('.step-action');
    expect(thirdLaneActions[1]?.textContent).toBe('mcp-call');
  });
});
