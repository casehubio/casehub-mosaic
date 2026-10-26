import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

@customElement('agency-deliberation-negotiation-view')
export class NegotiationView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    .header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-label {
      font-size: 12px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-name {
      font-size: 13px;
      font-weight: 500;
      color: #f0f4ff;
    }
    .type-badge {
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(203, 166, 247, 0.2);
      color: #cba6f7;
    }
    .header-desc {
      margin-left: auto;
      font-size: 11px;
      color: #7f849c;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body { padding: 24px 16px; }
    .parties {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .party-slot { text-align: center; }
    .exchange-icon {
      font-size: 20px;
      color: #7f849c;
    }
    .rounds {
      display: grid;
      gap: 6px;
      max-width: 500px;
      margin: 0 auto 12px;
    }
    .round-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      border-left: 3px solid;
    }
    .round-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      min-width: 50px;
    }
    .round-speaker {
      font-size: 12px;
      font-weight: 500;
    }
    .round-action {
      font-size: 10px;
      color: #7f849c;
      font-style: italic;
    }
    .rounds-ellipsis {
      text-align: center;
      font-size: 11px;
      color: #7f849c;
      padding: 4px;
    }
    .flow-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 0;
      color: #585b70;
    }
    .flow-line {
      width: 1px;
      height: 16px;
      background: #585b70;
    }
    .flow-arrow {
      font-size: 10px;
      line-height: 1;
    }
    .outcome-section {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 12px;
    }
    .outcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .outcome-label {
      font-size: 10px;
      font-weight: 600;
    }
    .outcome-label.accepted { color: #a6e3a1; }
    .outcome-label.deadlocked { color: #f38ba8; }
    .outcome-box {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
    }
    .outcome-box.accepted {
      border: 1px solid #a6e3a1;
      background: rgba(166, 227, 161, 0.08);
      color: #a6e3a1;
    }
    .outcome-box.deadlocked {
      border: 1px solid #f38ba8;
      background: rgba(243, 139, 168, 0.08);
      color: #f38ba8;
    }
    .metadata {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .meta-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 8px 14px;
      min-width: 140px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-type {
      font-size: 11px;
      font-weight: 600;
      color: #89b4fa;
    }
    .meta-detail {
      font-size: 10px;
      color: #7f849c;
      margin-top: 2px;
    }
  `];

  private static readonly PARTY_COLORS = ['#89b4fa', '#a6e3a1', '#fab387', '#cba6f7'] as const;
  private static readonly ROUND_ACTIONS: string[][] = [
    ['opens with initial proposal', 'presents counter-proposal'],
    ['offers concession', 'adjusts terms'],
    ['proposes compromise', 'evaluates trade-offs'],
  ];

  override render() {
    const p = this.spec as DeliberationPatternCategory;
    if (!p) return this.renderEmptyState();
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${this.renderParties(p)}
        ${this.renderRounds(p)}
        ${this.renderFlowIndicator()}
        ${this.renderOutcomes(p)}
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderParties(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const agents = p.agents ?? [];
    if (agents.length === 0) return nothing;
    if (agents.length === 2) {
      return html`
        <div class="parties">
          <div class="party-slot"><agent-card .agent=${agents[0]}></agent-card></div>
          <div class="exchange-icon">⇄</div>
          <div class="party-slot"><agent-card .agent=${agents[1]}></agent-card></div>
        </div>
      `;
    }
    return html`
      <div class="parties">
        ${agents.map(a => html`<agent-card .agent=${a}></agent-card>`)}
      </div>
    `;
  }

  private renderRounds(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const agents = p.agents ?? [];
    const maxRounds = p.maxRounds;
    if (agents.length < 2 || !maxRounds) return nothing;
    const previewRounds = Math.min(maxRounds, 3);
    const entries: TemplateResult[] = [];
    for (let r = 1; r <= previewRounds; r++) {
      for (let a = 0; a < Math.min(agents.length, 2); a++) {
        const agent = agents[a]!;
        const color = NegotiationView.PARTY_COLORS[a] ?? '#7f849c';
        const action = NegotiationView.ROUND_ACTIONS[r - 1]?.[a] ?? '';
        entries.push(html`
          <div class="round-entry" style="border-left-color:${color}">
            <span class="round-label">Round ${r}</span>
            <span class="round-speaker" style="color:${color}">${agent.name}</span>
            ${action ? html`<span class="round-action">${action}</span>` : nothing}
          </div>
        `);
      }
    }
    return html`
      <div class="rounds">${entries}</div>
      ${maxRounds > previewRounds
        ? html`<div class="rounds-ellipsis">⋮ until agreement or max ${maxRounds} rounds</div>`
        : nothing}
    `;
  }

  private renderFlowIndicator(): TemplateResult {
    return html`
      <div class="flow-indicator">
        <div class="flow-line"></div>
        <span class="flow-arrow">▼</span>
      </div>
    `;
  }

  private renderOutcomes(p: DeliberationPatternCategory): TemplateResult {
    const hasEscalation = p.failurePolicy?.onDeadlock === 'ESCALATE';
    return html`
      <div class="outcome-section">
        <div class="outcome">
          <div class="outcome-label accepted">ACCEPTED</div>
          <div class="outcome-box accepted">→ binding agreement</div>
        </div>
        <div class="outcome">
          <div class="outcome-label deadlocked">DEADLOCKED</div>
          <div class="outcome-box deadlocked">→ ${hasEscalation ? 'escalate' : 'fail'}</div>
        </div>
      </div>
    `;
  }

  private renderMetadata(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const cards: TemplateResult[] = [];
    if (p.maxRounds) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Max Rounds</div>
          <div class="meta-type">${p.maxRounds}</div>
        </div>
      `);
    }
    if (p.aggregation) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Aggregation</div>
          <div class="meta-type">${p.aggregation.type}</div>
        </div>
      `);
    }
    if (p.termination?.length) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Termination</div>
          ${p.termination.map(t => html`<div class="meta-type">${t.type}</div>`)}
        </div>
      `);
    }
    if (p.failurePolicy) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Failure Policy</div>
          ${p.failurePolicy.onRoutingFailure ? html`<div class="meta-detail">routing: ${p.failurePolicy.onRoutingFailure}</div>` : nothing}
          ${p.failurePolicy.onDeadlock ? html`<div class="meta-detail">deadlock: ${p.failurePolicy.onDeadlock}</div>` : nothing}
        </div>
      `);
    }
    return cards.length > 0 ? html`<div class="metadata">${cards}</div>` : nothing;
  }
}
