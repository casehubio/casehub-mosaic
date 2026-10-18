import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  CoordinationPipeline,
  CoordinationStep,
  CoordinationStepParams,
  Barrier,
  SwimLanes,
  MatchRouting,
  MatchCase,
  PhaseItem,
} from './coordination-types.js';
import { parseExpression } from './coordination-types.js';

const ACTION_ICONS: Record<string, { icon: string; cssClass: string }> = {
  'agent-delegate': { icon: '⬡', cssClass: 'agent' },
  'rest': { icon: 'R', cssClass: 'rest' },
  'graphql': { icon: 'G', cssClass: 'graphql' },
  'mcp-call': { icon: 'M', cssClass: 'mcp' },
};

const COLOR_MAP: Record<string, string> = {
  green: '#a6e3a1',
  amber: '#f9e2af',
  red: '#f38ba8',
  blue: '#89b4fa',
  purple: '#cba6f7',
  peach: '#fab387',
  teal: '#94e2d5',
  pink: '#f5c2e7',
};

@customElement('coordination-pipeline-view')
export class CoordinationPipelineView extends LitElement {
  @property({ attribute: false }) pipeline!: CoordinationPipeline;

  static override styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
      background: #282a3a;
      border: 1px solid #3b3d52;
      border-radius: 8px;
      overflow: hidden;
    }

    /* ─── Header ─── */
    .pipeline-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid #3b3d52;
    }
    .pipeline-header .icon {
      font-size: 14px;
      color: #89b4fa;
    }
    .pipeline-header .title {
      font-size: 12px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pipeline-header .meta {
      margin-left: auto;
      font-size: 11px;
      color: #585b70;
    }

    /* ─── Step Card ─── */
    .step-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      transition: background 0.15s;
    }
    .step-card:hover {
      background: rgba(255, 255, 255, 0.07);
    }
    .step-card.drillable {
      cursor: pointer;
      border-left: 3px solid #fab387;
    }
    .step-icon {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
      font-weight: 600;
    }
    .step-icon.agent   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
    .step-icon.rest    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
    .step-icon.graphql { background: rgba(245, 194, 231, 0.15); color: #f5c2e7; }
    .step-icon.mcp     { background: rgba(203, 166, 247, 0.15); color: #cba6f7; }
    .step-icon.approve { background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
    .step-icon.reject  { background: rgba(243, 139, 168, 0.15); color: #f38ba8; }
    .step-icon.warn    { background: rgba(249, 226, 175, 0.15); color: #f9e2af; }
    .step-action {
      font-weight: 500;
      color: #cdd6f4;
    }
    .step-target {
      color: #7f849c;
      font-size: 12px;
    }
    .step-badges {
      margin-left: auto;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .badge-model {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.2);
      color: #89b4fa;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .badge-format {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(166, 227, 161, 0.2);
      color: #a6e3a1;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .badge-channel {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.2);
      color: #cba6f7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .drill-hint {
      font-size: 11px;
      color: #585b70;
    }

    /* ─── Params / Invoke Body ─── */
    .invoke-body {
      padding: 4px 12px;
      font-size: 12px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      line-height: 1.6;
    }
    .invoke-body .key {
      color: #89b4fa;
    }
    .invoke-body .value {
      color: #a6e3a1;
    }
    .expr {
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .expr.from {
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
    }
    .expr.param {
      background: rgba(203, 166, 247, 0.15);
      color: #cba6f7;
    }
    .expr.literal {
      color: #a6e3a1;
    }

    /* ─── Barrier ─── */
    .barrier-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-top: 1px dashed #585b70;
      border-bottom: 1px dashed #585b70;
      background: rgba(255, 255, 255, 0.02);
    }
    .barrier-bar.signal {
      border-color: #cba6f7;
      background: rgba(203, 166, 247, 0.06);
    }
    .barrier-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .barrier-bar.signal .barrier-label {
      color: #cba6f7;
    }
    .barrier-bar.quorum .barrier-label {
      color: #7f849c;
    }
    .barrier-name {
      font-size: 12px;
      color: #7f849c;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .barrier-line {
      flex: 1;
      border-top: 1px dashed #585b70;
    }
    .barrier-bar.signal .barrier-line {
      border-color: #cba6f7;
    }
    .barrier-detail {
      font-size: 11px;
      color: #585b70;
    }

    /* ─── Swim Lanes ─── */
    .swim-lanes {
      display: grid;
      gap: 0;
    }
    .swim-lane {
      padding: 16px;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      min-height: 120px;
    }
    .swim-lane:last-child {
      border-right: none;
    }
    .lane-name {
      font-size: 13px;
      font-weight: 600;
      color: #89b4fa;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 2px solid #89b4fa;
      display: inline-block;
    }
    .lane-step {
      margin-bottom: 8px;
    }
    .lane-step .step-card {
      font-size: 12px;
    }
    .lane-step .badge-model,
    .lane-step .badge-format {
      font-size: 8px;
    }
    .lane-params {
      padding: 2px 12px;
      margin-bottom: 8px;
    }
    .lane-params .invoke-body {
      padding: 4px 0;
      font-size: 11px;
    }
    .lane-badges {
      font-size: 11px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      padding: 2px 12px;
      margin-bottom: 8px;
    }

    /* ─── Phase wrapper ─── */
    .phase-step {
      padding: 16px;
    }

    /* ─── Match/Case Routing ─── */
    .control-block {
      margin: 12px 0 0;
    }
    .control-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px 6px 0 0;
      font-size: 12px;
    }
    .keyword {
      font-weight: 600;
      color: #cba6f7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .condition {
      color: #f9e2af;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
    }
    .match-cases {
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: none;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    .match-case {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .match-case:last-child {
      border-bottom: none;
    }
    .match-pattern {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: #a6e3a1;
      min-width: 80px;
    }
    .match-arrow {
      color: #585b70;
    }
    .match-case .step-card {
      flex: 1;
      margin: 0;
    }
  `;

  override render() {
    if (!this.pipeline) return nothing;
    const p = this.pipeline;
    return html`
      ${this.renderHeader(p)}
      ${p.phases.map(phase => this.renderPhase(phase))}
    `;
  }

  private renderHeader(p: CoordinationPipeline): TemplateResult {
    const parts: string[] = [];
    if (p.agentCount != null) parts.push(`${p.agentCount} agents`);
    if (p.barrierCount != null) parts.push(`${p.barrierCount} barriers`);
    if (p.channelCount != null) parts.push(`${p.channelCount} channel${p.channelCount !== 1 ? 's' : ''}`);
    return html`
      <div class="pipeline-header">
        <span class="icon">⫘</span>
        <span class="title">${p.name}</span>
        ${parts.length > 0
          ? html`<span class="meta">${parts.join(' · ')}</span>`
          : nothing}
      </div>
    `;
  }

  private renderPhase(phase: PhaseItem): TemplateResult {
    switch (phase.type) {
      case 'step':
        return html`
          <div class="phase-step">
            ${this.renderStepCard(phase.step)}
            ${phase.step.params ? this.renderParams(phase.step.params) : nothing}
            ${phase.routing ? this.renderMatchRouting(phase.routing) : nothing}
          </div>
        `;
      case 'signal':
        return this.renderBarrier(phase.barrier);
      case 'quorum':
        return this.renderBarrier(phase.barrier);
      case 'parallel':
        return this.renderSwimLanes(phase.lanes);
    }
  }

  private renderStepCard(step: CoordinationStep): TemplateResult {
    const actionDef = ACTION_ICONS[step.action] ?? { icon: '•', cssClass: 'default' };
    let iconClass = actionDef.cssClass;
    let iconChar = step.icon ?? actionDef.icon;

    if (step.iconColor) {
      const colorMap: Record<string, string> = { green: 'approve', red: 'reject', amber: 'warn' };
      iconClass = colorMap[step.iconColor] ?? iconClass;
    }

    return html`
      <div class="step-card${step.drillDown ? ' drillable' : ''}">
        <div class="step-icon ${iconClass}">${iconChar}</div>
        <span class="step-action">${step.action}</span>
        ${step.target
          ? html`<span class="step-target">${step.target}</span>`
          : nothing}
        <span class="step-badges">
          ${step.model ? html`<span class="badge-model">${step.model}</span>` : nothing}
          ${step.outputFormat ? html`<span class="badge-format">${step.outputFormat}</span>` : nothing}
          ${step.channel ? html`<span class="badge-channel">→ ${step.channel}</span>` : nothing}
          ${step.drillDown ? html`<span class="drill-hint">↗ drill down</span>` : nothing}
        </span>
      </div>
    `;
  }

  private renderParams(params: CoordinationStepParams): TemplateResult {
    return html`
      <div class="invoke-body">
        ${Object.entries(params).map(([key, val]) => {
          const expr = parseExpression(val);
          return html`
            <div>
              <span class="key">${key}:</span>
              ${expr.type === 'literal'
                ? html`<span class="value">"${val}"</span>`
                : html`<span class="expr ${expr.type}">${val}</span>`}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderBarrier(barrier: Barrier): TemplateResult {
    const isSignal = barrier.type === 'signal';
    const label = isSignal ? '◇ signal' : '▮ quorum';
    const detail = barrier.type === 'quorum'
      ? `required: ${barrier.required} of ${barrier.of}`
      : (barrier as { description?: string }).description ?? '';

    return html`
      <div class="barrier-bar ${barrier.type}">
        <span class="barrier-label">${label}</span>
        <span class="barrier-name">${barrier.name}</span>
        <div class="barrier-line"></div>
        ${detail ? html`<span class="barrier-detail">${detail}</span>` : nothing}
      </div>
    `;
  }

  private renderSwimLanes(lanes: SwimLanes): TemplateResult {
    const entries = Object.entries(lanes);
    const cols = entries.length;
    return html`
      <div class="swim-lanes" style="grid-template-columns: ${'1fr '.repeat(cols).trim()}">
        ${entries.map(([name, steps]) => this.renderLane(name, steps))}
      </div>
    `;
  }

  private renderLane(name: string, steps: CoordinationStep[]): TemplateResult {
    return html`
      <div class="swim-lane">
        <div class="lane-name">${name}</div>
        ${steps.map(step => html`
          <div class="lane-step">
            ${this.renderStepCard(step)}
            ${step.params ? html`
              <div class="lane-params">
                <div class="invoke-body">
                  ${Object.entries(step.params).map(([key, val]) => {
                    const expr = parseExpression(val);
                    return html`
                      <div>
                        <span class="key">${key}:</span>
                        ${expr.type === 'literal'
                          ? html`<span class="value">"${val}"</span>`
                          : html`<span class="expr ${expr.type}">${val}</span>`}
                      </div>
                    `;
                  })}
                </div>
              </div>
            ` : nothing}
          </div>
        `)}
      </div>
    `;
  }

  private renderMatchRouting(routing: MatchRouting): TemplateResult {
    return html`
      <div class="control-block">
        <div class="control-header">
          <span class="keyword">match</span>
          <span class="condition">${routing.expression}</span>
        </div>
        <div class="match-cases">
          ${routing.cases.map(c => this.renderMatchCase(c))}
        </div>
      </div>
    `;
  }

  private renderMatchCase(c: MatchCase): TemplateResult {
    return html`
      <div class="match-case">
        <span class="match-pattern">"${c.pattern}"</span>
        <span class="match-arrow">→</span>
        ${this.renderStepCard(c.step)}
      </div>
    `;
  }
}
