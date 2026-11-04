import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@casehubio/mosaic-summarisation-timeline';
import type { SummarisationSnapshot } from '@casehubio/mosaic-core';

const SAMPLE: SummarisationSnapshot = {
  snapshotId: 'gallery-snap',
  caseExecutionId: 'gallery-exec',
  pipelineName: 'clinical-pipeline',
  timeRange: { from: 0, to: 60000 },
  rawEvents: Array.from({ length: 50 }, (_, i) => ({
    id: `l1-${i}`, timestamp: i * 1200,
    classification: i % 3 === 0 ? 'abnormal' : 'normal',
    payload: { value: Math.round(Math.random() * 100) },
    lineageRefs: [`l2-${Math.floor(i / 5)}`],
  })),
  summarisedEvents: Array.from({ length: 10 }, (_, i) => ({
    id: `l2-${i}`, from: i * 6000, to: (i + 1) * 6000 - 500,
    label: `Episode ${i + 1}`,
    classification: i % 4 === 0 ? 'alert' : 'normal',
    payload: { count: 5 },
    sourceRefs: Array.from({ length: 5 }, (_, j) => `l1-${i * 5 + j}`),
    lineageRefs: [i < 4 ? 'l3-0' : i < 7 ? 'l3-1' : 'l3-2'],
  })),
  phaseSummaries: [
    { id: 'l3-0', from: 0, to: 19000, label: 'Observation', classification: 'stable',
      payload: {}, sourceRefs: ['l2-0', 'l2-1', 'l2-2', 'l2-3'], windowPolicy: { maxCount: 4 } },
    { id: 'l3-1', from: 24000, to: 41000, label: 'Deterioration', classification: 'critical',
      payload: {}, sourceRefs: ['l2-4', 'l2-5', 'l2-6'], windowPolicy: { maxAge: 18000 } },
    { id: 'l3-2', from: 42000, to: 59000, label: 'Recovery', classification: 'improving',
      payload: {}, sourceRefs: ['l2-7', 'l2-8', 'l2-9'], windowPolicy: { maxCount: 3 } },
  ],
  steps: [
    {
      caseId: 'c1', stepName: 'Initial Triage',
      signals: [{ type: 'CONFIRM', summary: 'Vitals within range', confidence: 0.92, keyFacts: ['HR 72', 'BP 120/80'] }],
      from: 0, to: 20000,
    },
    {
      caseId: 'c1', stepName: 'Escalation Decision',
      signals: [{ type: 'ALERT', summary: 'Deterioration detected', confidence: 0.78, keyFacts: ['HR spike'] }],
      from: 20000, to: 40000,
    },
    {
      caseId: 'c1', stepName: 'Recovery Assessment',
      signals: [{ type: 'CONFIRM', summary: 'Stabilising', confidence: 0.88, keyFacts: ['Vitals normalising', 'Resp rate stable'] }],
      from: 40000, to: 60000,
    },
  ],
  narrative: { explanation: 'Pipeline processed 50 raw events through 3 summarisation levels over a 60-second observation window.' },
};

@customElement('agency-example-summarisation-timeline')
export class SummarisationTimelinePage extends LitElement {
  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); margin-bottom: 8px; }
    p { color: var(--pages-neutral-11, #555); font-size: 14px; margin-bottom: 24px; }
    .container { border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px;
      background: var(--pages-neutral-1, #fff); padding: 16px; }
  `;

  override render() {
    return html`
      <h2>Summarisation Timeline</h2>
      <p>Four-lane timeline visualising runtime output from the summarisation pipeline.
        L1 raw events (dense dots with clustering), L2 episodes (cards), L3 phases (bars),
        L4 narrative (decision steps). Hover events for lineage curves. Ctrl+scroll to zoom.
        Brush the minimap to select time range.</p>
      <div class="container">
        <agency-summarisation-timeline .data=${SAMPLE}></agency-summarisation-timeline>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'agency-example-summarisation-timeline': SummarisationTimelinePage; }
}
